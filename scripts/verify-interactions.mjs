import { writeFile } from 'node:fs/promises';

const targets = await fetch('http://127.0.0.1:9223/json/list').then((response) => response.json());
const page = targets.find((target) => target.type === 'page');

if (!page) throw new Error('No Chrome page target found.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  commandId += 1;
  return new Promise((resolve, reject) => {
    pending.set(commandId, { resolve, reject });
    socket.send(JSON.stringify({ id: commandId, method, params }));
  });
}

async function evaluate(expression, awaitPromise = false) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const wait = (milliseconds) =>
  evaluate(`new Promise(resolve => setTimeout(resolve, ${milliseconds}))`, true);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function screenshot(path) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(path, Buffer.from(shot.data, 'base64'));
}

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
await wait(1700);

const initial = await evaluate(`({
  title: document.title,
  globalActions: document.querySelectorAll('.hero-action').length,
  tiles: document.querySelectorAll('.sport-tile').length,
  imagesInsideMap: document.querySelectorAll('.map-world img').length,
  largeTiles: document.querySelectorAll('.sport-tile--large').length,
  mediumTiles: document.querySelectorAll('.sport-tile--medium').length,
  smallTiles: document.querySelectorAll('.sport-tile--small').length,
  networkPaths: document.querySelectorAll('.network-path').length,
  tileAreaCoverage: (() => {
    const world = document.querySelector('.map-world');
    const area = [...document.querySelectorAll('.sport-tile')]
      .reduce((sum, tile) => sum + tile.offsetWidth * tile.offsetHeight, 0);
    return Math.round((area / (world.offsetWidth * world.offsetHeight)) * 1000) / 10;
  })(),
  touchesEveryEdge: (() => {
    const world = document.querySelector('.map-world');
    const tiles = [...document.querySelectorAll('.sport-tile')];
    return Math.min(...tiles.map(tile => tile.offsetLeft)) === 0 &&
      Math.min(...tiles.map(tile => tile.offsetTop)) === 0 &&
      Math.max(...tiles.map(tile => tile.offsetLeft + tile.offsetWidth)) === world.offsetWidth &&
      Math.max(...tiles.map(tile => tile.offsetTop + tile.offsetHeight)) === world.offsetHeight;
  })(),
  repeatedNeighborShapes: (() => {
    const tiles = [...document.querySelectorAll('.sport-tile')];
    let repeated = 0;
    for (let index = 0; index < tiles.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < tiles.length; otherIndex += 1) {
        const first = tiles[index];
        const second = tiles[otherIndex];
        const verticalTouch =
          (first.offsetLeft + first.offsetWidth === second.offsetLeft ||
            second.offsetLeft + second.offsetWidth === first.offsetLeft) &&
          Math.max(first.offsetTop, second.offsetTop) <
            Math.min(first.offsetTop + first.offsetHeight, second.offsetTop + second.offsetHeight);
        const horizontalTouch =
          (first.offsetTop + first.offsetHeight === second.offsetTop ||
            second.offsetTop + second.offsetHeight === first.offsetTop) &&
          Math.max(first.offsetLeft, second.offsetLeft) <
            Math.min(first.offsetLeft + first.offsetWidth, second.offsetLeft + second.offsetWidth);
        if (
          (verticalTouch || horizontalTouch) &&
          first.offsetWidth === second.offsetWidth &&
          first.offsetHeight === second.offsetHeight
        ) repeated += 1;
      }
    }
    return repeated;
  })(),
  dialogOpen: Boolean(document.querySelector('[role="dialog"]')),
  zoom: document.querySelector('.zoom-readout strong')?.textContent,
  world: {
    width: document.querySelector('.map-world')?.offsetWidth,
    height: document.querySelector('.map-world')?.offsetHeight,
  },
  camera: getComputedStyle(document.querySelector('.map-world')).transform
})`);
await screenshot('/tmp/sport-map-desktop.png');

const framePacing = await evaluate(`new Promise((resolve) => {
  const world = document.querySelector('.map-world');
  const originalTransform = world.style.transform;
  const timestamps = [];
  let startedAt = 0;

  function sample(timestamp) {
    if (!startedAt) startedAt = timestamp;
    timestamps.push(timestamp);
    const progress = Math.min(1, (timestamp - startedAt) / 1000);
    world.style.transform = 'translate3d(' + (-2890 + progress * 900) + 'px, -1788px, 0) scale(0.76)';

    if (progress < 1) requestAnimationFrame(sample);
    else {
      world.style.transform = originalTransform;
      const intervals = timestamps.slice(1).map((value, index) => value - timestamps[index]);
      const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
      resolve({
        frames: timestamps.length,
        averageFps: Math.round(1000 / averageInterval),
        slowestFrameMs: Math.round(Math.max(...intervals) * 10) / 10,
      });
    }
  }

  requestAnimationFrame(sample);
})`, true);

const pointerFocusCandidate = await evaluate(`(() => {
  const candidates = [...document.querySelectorAll('[data-tile-id]')]
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.dataset.tileId,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    })
    .filter((rect) =>
      rect.id !== 'brand-slot-001' &&
      rect.right > 40 && rect.left < innerWidth - 40 &&
      rect.bottom > 100 && rect.top < innerHeight - 100
    )
    .sort((first, second) => second.bottom - first.bottom);
  const target = candidates[0];
  return {
    id: target.id,
    x: Math.max(40, Math.min(innerWidth - 40, (Math.max(0, target.left) + Math.min(innerWidth, target.right)) / 2)),
    y: Math.max(100, Math.min(innerHeight - 100, (Math.max(0, target.top) + Math.min(innerHeight, target.bottom)) / 2)),
  };
})()`);
const cameraBeforePointerHold = await evaluate(
  `getComputedStyle(document.querySelector('.map-world')).transform`,
);
await send('Input.dispatchMouseEvent', {
  type: 'mousePressed',
  x: pointerFocusCandidate.x,
  y: pointerFocusCandidate.y,
  button: 'left',
  buttons: 1,
  clickCount: 1,
});
await wait(240);
const cameraDuringPointerHold = await evaluate(
  `getComputedStyle(document.querySelector('.map-world')).transform`,
);
await send('Input.dispatchMouseEvent', {
  type: 'mouseMoved',
  x: pointerFocusCandidate.x + 18,
  y: pointerFocusCandidate.y,
  button: 'left',
  buttons: 1,
});
await send('Input.dispatchMouseEvent', {
  type: 'mouseReleased',
  x: pointerFocusCandidate.x + 18,
  y: pointerFocusCandidate.y,
  button: 'left',
  buttons: 0,
  clickCount: 1,
});
await evaluate(`document.querySelector('.hero-action').click()`);
await wait(1000);

const cameraBeforeActivation = await evaluate(
  `getComputedStyle(document.querySelector('.map-world')).transform`,
);
await evaluate(`document.querySelector('[data-tile-id="brand-slot-001"]').click()`);
await wait(360);
const activationDuringFlight = await evaluate(`({
  modalOpen: Boolean(document.querySelector('[role="dialog"]')),
  camera: getComputedStyle(document.querySelector('.map-world')).transform
})`);
await wait(1580);
const modal = await evaluate(`({
  open: Boolean(document.querySelector('[role="dialog"]')),
  title: document.querySelector('#modal-title')?.textContent,
  placeholder: Boolean(document.querySelector('.modal-visual--placeholder')),
  focusedControl: document.activeElement?.className
})`);

await evaluate(`document.querySelector('.modal-close').click()`);
await wait(360);
const closed = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);

const zoomBefore = await evaluate(`document.querySelector('.zoom-readout strong').textContent`);
await evaluate(`document.querySelector('.map-viewport').dispatchEvent(new WheelEvent('wheel', {
  bubbles: true,
  cancelable: true,
  clientX: 720,
  clientY: 450,
  deltaY: -120
}))`);
await wait(140);
const zoomDuring = await evaluate(`document.querySelector('.zoom-readout strong').textContent`);
await wait(300);
const zoomAfter = await evaluate(`document.querySelector('.zoom-readout strong').textContent`);

const cameraBeforeDrag = await evaluate(`getComputedStyle(document.querySelector('.map-world')).transform`);
await send('Input.dispatchMouseEvent', {
  type: 'mousePressed', x: 720, y: 450, button: 'left', buttons: 1, clickCount: 1,
});
await send('Input.dispatchMouseEvent', {
  type: 'mouseMoved', x: 840, y: 520, button: 'left', buttons: 1,
});
await send('Input.dispatchMouseEvent', {
  type: 'mouseMoved', x: 980, y: 595, button: 'left', buttons: 1,
});
await send('Input.dispatchMouseEvent', {
  type: 'mouseReleased', x: 980, y: 595, button: 'left', buttons: 0, clickCount: 1,
});
await wait(30);
const cameraAtRelease = await evaluate(`getComputedStyle(document.querySelector('.map-world')).transform`);
await wait(360);
const cameraAfterInertia = await evaluate(`getComputedStyle(document.querySelector('.map-world')).transform`);
await wait(120);
const centerButtonAfterPan = await evaluate(`Boolean(document.querySelector('.center-map-button'))`);
if (centerButtonAfterPan) {
  await evaluate(`document.querySelector('.center-map-button').click()`);
  await wait(1050);
}
const centered = await evaluate(`({
  buttonVisible: Boolean(document.querySelector('.center-map-button')),
  camera: getComputedStyle(document.querySelector('.map-world')).transform
})`);

const leftEdgeTileId = await evaluate(
  `[...document.querySelectorAll('.sport-tile')].find(node => node.offsetLeft === 0)?.querySelector('[data-tile-id]')?.dataset.tileId`,
);
await evaluate(`document.querySelector('[data-tile-id="${leftEdgeTileId}"]').click()`);
await wait(1950);
const edgeFocus = await evaluate(`(() => {
  const rect = document.querySelector('[data-tile-id="${leftEdgeTileId}"]').getBoundingClientRect();
  return {
    modalOpen: Boolean(document.querySelector('[role="dialog"]')),
    tileId: '${leftEdgeTileId}',
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    viewportCenterX: innerWidth / 2,
    viewportCenterY: innerHeight / 2,
  };
})()`);
await evaluate(`document.querySelector('.modal-close').click()`);
await wait(1000);

await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await send('Page.reload', { ignoreCache: false });
await delay(1400);
const mobile = await evaluate(`({
  actionsVisible: [...document.querySelectorAll('.hero-action')].every(node => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0;
  }),
  tiles: document.querySelectorAll('.sport-tile').length,
  overflow: document.documentElement.scrollWidth === innerWidth,
  zoom: document.querySelector('.zoom-readout strong')?.textContent
})`);
await screenshot('/tmp/sport-map-mobile.png');

const report = {
  initial,
  framePacing,
  pointerFocus: {
    candidate: pointerFocusCandidate.id,
    cameraMovedBeforeRelease: cameraBeforePointerHold !== cameraDuringPointerHold,
  },
  cardActivation: {
    cameraBefore: cameraBeforeActivation,
    modalDuringFlight: activationDuringFlight.modalOpen,
    cameraDuringFlight: activationDuringFlight.camera,
    cameraMovedBeforeModal: cameraBeforeActivation !== activationDuringFlight.camera,
  },
  modal,
  dialogAfterClose: closed,
  zoom: { before: zoomBefore, duringTween: zoomDuring, after: zoomAfter },
  drag: {
    before: cameraBeforeDrag,
    atRelease: cameraAtRelease,
    afterInertia: cameraAfterInertia,
    moved: cameraBeforeDrag !== cameraAtRelease,
    continuedAfterRelease: cameraAtRelease !== cameraAfterInertia,
  },
  centerControl: { visibleAfterPan: centerButtonAfterPan, afterClick: centered },
  edgeFocus,
  mobile,
  screenshots: ['/tmp/sport-map-desktop.png', '/tmp/sport-map-mobile.png'],
};

const checks = [
  ['exactly two global actions', initial.globalActions === 2],
  ['all 225 tiles render', initial.tiles === 225],
  ['tiles cover the entire world', initial.tileAreaCoverage === 100 && initial.touchesEveryEdge],
  ['neighboring tile shapes are varied', initial.repeatedNeighborShapes === 0],
  ['frame pacing stays usable', framePacing.averageFps >= 45],
  ['pointer focus does not move the camera before release', cameraBeforePointerHold === cameraDuringPointerHold],
  ['card activation moves before opening the modal', !activationDuringFlight.modalOpen && cameraBeforeActivation !== activationDuringFlight.camera],
  ['modal opens and receives focus', modal.open && modal.focusedControl === 'modal-close'],
  ['modal closes', closed === false],
  ['wheel zoom changes the zoom level', zoomAfter !== zoomBefore],
  ['drag moves the camera', cameraBeforeDrag !== cameraAtRelease],
  ['drag continues with inertia', cameraAtRelease !== cameraAfterInertia],
  ['center control appears and recenters', centerButtonAfterPan && !centered.buttonVisible],
  ['edge tile centers before modal', edgeFocus.modalOpen && Math.abs(edgeFocus.centerX - edgeFocus.viewportCenterX) < 1 && Math.abs(edgeFocus.centerY - edgeFocus.viewportCenterY) < 1],
  ['mobile layout remains inside the viewport', mobile.actionsVisible && mobile.overflow && mobile.tiles === 225],
];
const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
report.checks = { passed: checks.length - failures.length, total: checks.length, failures };

console.log(JSON.stringify(report, null, 2));

socket.close();

if (failures.length) {
  throw new Error(`Interaction checks failed: ${failures.join(', ')}`);
}

type FrameTask = (now: number) => void;
const tasks = new Set<FrameTask>();
let request = 0;

function frame(now: number) {
  request = 0;
  for (const task of tasks) task(now);
  if (tasks.size && !request) request = requestAnimationFrame(frame);
}

export function watchCircuitClock(task: FrameTask) {
  tasks.add(task);
  if (!request) request = requestAnimationFrame(frame);
  return () => {
    tasks.delete(task);
    if (!tasks.size) {
      cancelAnimationFrame(request);
      request = 0;
    }
  };
}

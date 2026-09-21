import { EventBus } from "../core/EventBus";
import { GameSimulation } from "../game/GameSimulation";
import { isPhysicsRequest, type PhysicsWorkerRequest, type PhysicsWorkerResponse } from "./PhysicsWorkerProtocol";

let simulation: GameSimulation | null = null;

self.onmessage = (event: MessageEvent<PhysicsWorkerRequest>) => {
  const request = event.data;
  if (!isPhysicsRequest(request)) return;
  try {
    if (request.type === "initialize") {
      simulation = new GameSimulation();
      simulation.start();
      respond({ type: "ready", tick: simulation.world.state.tick });
    } else if (request.type === "step" && simulation) {
      simulation.setInput(request.input);
      simulation.fixedUpdate(request.dt, simulation.world.state.tick);
      respond({ type: "step-complete", tick: simulation.world.state.tick, snapshot: simulation.snapshot() });
    } else if (request.type === "restore" && simulation) {
      simulation.world.restore(request.snapshot);
    } else if (request.type === "snapshot" && simulation) {
      respond({ type: "snapshot", snapshot: simulation.snapshot() });
    } else if (request.type === "dispose") {
      simulation?.stop();
      simulation = null;
    }
  } catch (error) {
    respond({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};

function respond(response: PhysicsWorkerResponse): void {
  self.postMessage(response);
}
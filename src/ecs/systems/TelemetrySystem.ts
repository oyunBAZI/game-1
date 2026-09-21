import { EventBus } from "../../core/EventBus";
import { BaseSystem } from "../System";
import { GameplayComponent } from "../components/GameplayComponent";
import { EcsWorld } from "../World";

export class TelemetrySystem extends BaseSystem {
  readonly id = "ecs-telemetry";
  priority = 90;
  private emissions = 0;

  constructor(private readonly events: EventBus) {
    super();
  }

  fixedUpdate(world: EcsWorld, dt: number, tick: number): void {
    for (const entity of world.query(GameplayComponent)) {
      const gameplay = entity.require(GameplayComponent);
      gameplay.tickTimers(dt);
      if (gameplay.hasFlag("telemetry")) {
        this.events.emitUnknown("ecs:telemetry", {
          tick,
          entity: entity.id,
          role: gameplay.role,
          stamina: gameplay.stamina
        });
        this.emissions += 1;
      }
    }
  }

  count(): number {
    return this.emissions;
  }
}
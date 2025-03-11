import Box from "@/components/Box";
import Matter from "matter-js";
import React from "react";
import {
  StyleSheet,
  StatusBar,
  View,
  Dimensions,
  Text,
  Button,
} from "react-native";
import { GameEngine } from "react-native-game-engine-skia";

const { width, height } = Dimensions.get("screen");

// Types for game entities and events
type EntityType = {
  body: Matter.Body;
  size: [number, number];
  color: string;
  renderer: React.ComponentType<any>;
  static?: boolean;
};

type EntitiesType = {
  physics: {
    engine: Matter.Engine;
    world: Matter.World;
  };
  [key: string]: EntityType | any;
};

type TouchEvent = {
  type: string;
  event: { pageX: number; pageY: number };
};

type GameEvent = {
  type: string;
};

// Calculate box size based on screen dimensions
const getBoxSize = () => Math.trunc(Math.max(width, height) * 0.075);

export default class GameScreen extends React.Component {
  private gameEngine: any = null;
  private boxIds: number = 0;
  private engine: Matter.Engine;
  private world: Matter.World;
  private startEntities: EntitiesType;

  constructor(props: any) {
    super(props);

    // Initialize physics engine
    this.engine = Matter.Engine.create({ enableSleeping: false });
    this.world = this.engine.world;

    // Create initial entities
    this.startEntities = this.createInitialEntities();
  }

  // Creates the initial game entities
  private createInitialEntities(): EntitiesType {
    const boxSize = getBoxSize();

    const initialBox = Matter.Bodies.rectangle(
      width / 2,
      height / 2,
      boxSize,
      boxSize,
      {
        frictionAir: 0.021,
        restitution: 0.5,
      }
    );

    const floor = Matter.Bodies.rectangle(
      width / 2,
      height - boxSize,
      width,
      boxSize,
      { isStatic: true }
    );

    Matter.World.add(this.world, [initialBox, floor]);

    return {
      physics: {
        engine: this.engine,
        world: this.world,
      },
      initialBox: {
        body: initialBox,
        size: [boxSize, boxSize],
        static: false,
        color: "red",
        renderer: Box,
      },
      floor: {
        body: floor,
        size: [width, boxSize],
        static: true,
        color: "green",
        renderer: Box,
      },
    };
  }

  // Creates a new box at the touch position
  private createBox = (
    entities: EntitiesType,
    {
      touches,
      screen,
    }: { touches: TouchEvent[]; screen: { width: number; height: number } }
  ) => {
    const world = entities["physics"].world;
    const boxSize = Math.trunc(Math.max(screen.width, screen.height) * 0.075);

    touches
      .filter((t: TouchEvent) => t.type === "press")
      .forEach((t: TouchEvent) => {
        const body = Matter.Bodies.rectangle(
          t.event.pageX,
          t.event.pageY,
          boxSize,
          boxSize,
          { frictionAir: 0.021, restitution: 1.0 }
        );
        Matter.World.add(world, [body]);
        entities[++this.boxIds] = {
          body: body,
          size: [boxSize, boxSize],
          color: this.boxIds % 2 == 0 ? "pink" : "#B8E986",
          renderer: Box,
        };
      });
    return entities;
  };

  // Resets the game by removing all bodies from the world
  private reset = (entities: EntitiesType) => {
    const physics = entities["physics"];
    const world = physics.world;
    const bodies = Matter.Composite.allBodies(world);
    Matter.World.remove(world, bodies);
    return entities;
  };

  // Updates the physics engine
  private physics = (
    entities: EntitiesType,
    { time }: { time: { delta: number } }
  ) => {
    const engine = entities["physics"].engine;
    Matter.Engine.update(engine, time.delta);
    return entities;
  };

  // Handles reset events
  private resetSystem = (
    entities: EntitiesType,
    { events = [] }: { events: GameEvent[] }
  ) => {
    if (events.length > 0) {
      events.forEach((event: GameEvent) => {
        if (event.type === "reset") {
          return this.reset(entities);
        }
      });
    }
    return entities;
  };

  // Resets the game state
  private resetGame = () => {
    if (this.gameEngine) {
      this.gameEngine.dispatch({ type: "reset" });

      if (this.gameEngine.clear) {
        this.gameEngine.clear();
      }

      this.forceUpdate();

      setTimeout(() => {
        if (this.gameEngine) {
          const boxSize = getBoxSize();
          const initialBox = Matter.Bodies.rectangle(
            width / 2,
            height / 2,
            boxSize,
            boxSize,
            {
              frictionAir: 0.021,
              restitution: 0.5,
            }
          );

          const floor = Matter.Bodies.rectangle(
            width / 2,
            height - boxSize,
            width,
            boxSize,
            { isStatic: true }
          );

          Matter.World.add(this.world, [initialBox, floor]);
          this.gameEngine.swap(this.startEntities);
          this.forceUpdate();
        }
      }, 50);
    }
  };

  render() {
    return (
      <GameEngine
        ref={(ref: any) => {
          this.gameEngine = ref;
        }}
        style={styles.container}
        systems={[this.physics, this.resetSystem, this.createBox]}
        entities={this.startEntities}
      >
        <Button onPress={this.resetGame} title="Reset" />
        <StatusBar hidden={true} />
      </GameEngine>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});

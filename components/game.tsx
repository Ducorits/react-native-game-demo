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
import { Gyroscope, GyroscopeMeasurement } from "expo-sensors";
import { Accelerometer } from "expo-sensors";

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

function normalizeVector3({ x, y, z }: { x: number; y: number; z: number }) {
  const length = Math.sqrt(x * x + y * y + z * z);
  return {
    x: x / length,
    y: y / length,
    z: z / length,
  };
}

export default class GameScreen extends React.Component {
  private gameEngine: any = null;
  private engine: Matter.Engine;
  private world: Matter.World;
  private entity_count: number = 0;
  private gravity_dir: { x: number; y: number } = { x: 0, y: 1 };
  private gyro_enabled: boolean = false;
  private gyro_subscription: any | null = null;
  private gyroscopeData: {
    x: number;
    y: number;
    z: number;
  } = { x: 0, y: 0, z: 0 };

  constructor(props: any) {
    super(props);

    // Initialize physics engine
    this.engine = Matter.Engine.create({ enableSleeping: false });
    this.world = this.engine.world;
  }

  private setGyro = (gyroscopeData: GyroscopeMeasurement) => {
    console.log(gyroscopeData);
    this.gyroscopeData == gyroscopeData;
    let vec3 = normalizeVector3(gyroscopeData);
    this.gravity_dir = { x: vec3.x, y: vec3.y };
  };

  private addRectangle = (
    entities: EntitiesType,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    options?: Matter.IChamferableBodyDefinition
  ) => {
    const rectangle = Matter.Bodies.rectangle(x, y, width, height, options);
    Matter.World.add(this.world, rectangle);

    entities[++this.entity_count] = {
      body: rectangle,
      size: [width, height],
      color: color,
      renderer: Box,
    };
  };

  // Creates the initial game entities
  private addInitialEntities(entities: EntitiesType) {
    const boxSize = getBoxSize();

    //Start box
    this.addRectangle(
      entities,
      width / 2,
      height / 2,
      boxSize,
      boxSize,
      "red",
      {
        frictionAir: 0.021,
        restitution: 0.5,
      }
    );
    //Floor
    this.addRectangle(
      entities,
      width / 2,
      height - boxSize,
      width,
      boxSize,
      "green",
      { isStatic: true }
    );
    //Ceiling
    this.addRectangle(entities, width / 2, 10, width, boxSize, "green", {
      isStatic: true,
    });
    //Left Wall
    this.addRectangle(
      entities,
      -boxSize / 2,
      height / 2,
      boxSize,
      height,
      "green",
      {
        isStatic: true,
      }
    );
    //Right Wall
    this.addRectangle(
      entities,
      width + boxSize / 2,
      height / 2,
      boxSize,
      height,
      "green",
      {
        isStatic: true,
      }
    );
  }

  // Creates a new box at the touch position
  private createBox = (
    entities: EntitiesType,
    {
      touches,
      screen,
    }: { touches: TouchEvent[]; screen: { width: number; height: number } }
  ) => {
    const boxSize = Math.trunc(Math.max(screen.width, screen.height) * 0.075);

    touches
      .filter((t: TouchEvent) => t.type === "press")
      .forEach((t: TouchEvent) => {
        const world = this.world;
        this.addRectangle(
          entities,
          t.event.pageX,
          t.event.pageY,
          boxSize,
          boxSize,
          this.entity_count % 2 == 0 ? "pink" : "#B8E986",
          { frictionAir: 0.021, restitution: 0.5 }
        );
      });
    return entities;
  };

  private startedHandler = (entities: EntitiesType) => {
    this.addInitialEntities(entities);
    return entities;
  };

  private toggleGyro = () => {
    this.gyro_enabled = !this.gyro_enabled;
    if (this.gyro_enabled) {
      this.gyro_subscription = Accelerometer.addListener(({ x, y, z }) => {
        // Check which axis is most influenced by gravity (largest absolute value)
        // and set gravity accordingly.
        // let vec3 = normalizeVector3({ x: x * -1, y, z });
        this.gravity_dir = { x: x * -1, y: y };
        // if (Math.abs(x) > Math.abs(y)) {
        //   // Left/right side is down
        //   this.gravity_dir = { x: x < 0 ? 1 : -1, y: 0 };
        // } else {
        //   // Top/bottom side is down
        //   this.gravity_dir = { x: 0, y: y < 0 ? -1 : 1 };
        // }
      });
    } else {
      this.gyro_subscription.remove();
    }
  };

  // Resets the game physics by removing all bodies from the physics world
  private reset = (entities: EntitiesType) => {
    // Reset all physics bodies.
    const world = this.world;
    const bodies = Matter.Composite.allBodies(world);
    Matter.World.remove(world, bodies);

    let oldEntities = Object.keys(entities).map((key) => ({ id: key }));

    for (let i = 0; i < oldEntities.length; i++) {
      let id = oldEntities[i].id;
      console.log(id + entities[id]);
      delete entities[oldEntities[i].id];
    }

    this.addInitialEntities(entities);

    return entities;
  };

  // Updates the physics engine
  private physics = (
    entities: EntitiesType,
    { time }: { time: { delta: number } }
  ) => {
    const engine = this.engine;
    engine.gravity.x = this.gravity_dir.x;
    engine.gravity.y = this.gravity_dir.y;
    Matter.Engine.update(engine, time.delta);

    return entities;
  };

  private eventsSystem = (
    entities: EntitiesType,
    { events = [] }: { events: GameEvent[] }
  ) => {
    if (events.length > 0) {
      events.forEach((event: GameEvent) => {
        if (event.type === "reset") {
          return this.reset(entities);
        } else if (event.type === "started") {
          return this.startedHandler(entities);
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
    }
  };

  render() {
    return (
      <GameEngine
        ref={(ref: any) => {
          this.gameEngine = ref;
        }}
        style={styles.container}
        systems={[this.physics, this.eventsSystem, this.createBox]}
      >
        <View style={{ position: "absolute", top: 30 }}>
          <Button onPress={this.resetGame} title="Reset" />
        </View>
        <View style={{ position: "absolute", top: 30, left: 100 }}>
          <Button onPress={this.toggleGyro} title="Toggle Gyro" />
        </View>
        {/* <View style={{ position: "absolute", top: 70, left: 100, flex: 1 }}>
          <Text>
            x: {this.gyroscopeData.x} y: {this.gyroscopeData.y} z:{" "}
            {this.gyroscopeData.z}
          </Text>
        </View> */}
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

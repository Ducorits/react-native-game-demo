import React, { Component } from "react";
import { View } from "react-native";
import { array, object, string } from "prop-types";

import { Rect, Group, Skia } from "@shopify/react-native-skia";

export default class Box extends Component<{
  size: [number, number];
  body: { position: { x: number; y: number }; angle: number };
  color?: string;
}> {
  render() {
    const width = this.props.size[0];
    const height = this.props.size[1];
    const color = this.props.color;
    const x = this.props.body.position.x - width / 2;
    const y = this.props.body.position.y - height / 2;
    const angle = this.props.body.angle;
    // const rsxForm = Skia.RSXformFromRadians(1, angle, 0, 0, 0, 0);

    return (
      <Group
        origin={{ x: x + width / 2, y: y + height / 2 }}
        transform={[{ rotate: angle }]}
      >
        <Rect x={x} y={y} width={width} height={height} color={color} />
      </Group>
    );
  }
}

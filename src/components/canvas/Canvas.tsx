import styled from "@emotion/styled";
import { forwardRef, RefAttributes } from "react";

const $Canvas = styled.canvas`
  height: 100%;
  width: 100%;
`;

const Container = styled.div`
  --padding: 0rem;
  height: calc(100vh - var(--padding) * 2);
  width: calc(100vw - var(--padding) * 2);
  padding: var(--padding);
  position: absolute;
  display: flex;
`;

type CanvasProps = {
  id: string;
};

export const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  ({ id }, ref) => {
    return (
      <Container>
        <$Canvas id={id} ref={ref} />
      </Container>
    );
  }
);

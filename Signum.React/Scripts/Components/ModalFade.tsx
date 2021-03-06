﻿import * as React from 'react';
import Transition, { TransitionStatus, EnterHandler, EndHandler, ExitHandler } from 'react-transition-group/Transition';
import { classes } from '../Globals';

export interface FadeProps {
  appear?: boolean;
  in?: boolean;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  timeout: number | { enter?: number, exit?: number };
  addEndListener?: EndHandler;
  onEnter?: EnterHandler;
  onEntering?: EnterHandler;
  onEntered?: EnterHandler;
  onExit?: ExitHandler;
  onExiting?: ExitHandler;
  onExited?: ExitHandler;
  children: React.ReactElement<any>
};

const fadeClass = {
  ["entering" as TransitionStatus]: 'show',
  ["entered" as TransitionStatus]: 'show',
};

export class ModalFade extends React.Component<FadeProps> {

  static defaultProps = {
    in: false,
    timeout: 300,
    mountOnEnter: false,
    unmountOnExit: false,
    appear: false
  };

  render() {
    const { children, ...props } = this.props;

    return (
      <Transition {...props} >
        {(state) => React.cloneElement(children, { className: classes(children.props.className, 'fade', fadeClass[state]) })}
      </Transition>
    );
  }
}

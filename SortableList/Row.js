import React, { Component, cloneElement } from 'react';
import PropTypes from 'prop-types';
import { PanResponder, StyleSheet, View } from 'react-native';

export default class Row extends Component {
  static propTypes = {
    children: PropTypes.node,
    animated: PropTypes.bool,
    disabled: PropTypes.bool,
    horizontal: PropTypes.bool,
    location: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
    manuallyActivateRows: PropTypes.bool,
    activationTime: PropTypes.number,

    // Will be called when touch down
    onTouchStart: PropTypes.func,
    // Will be called on long press.
    onActivate: PropTypes.func,
    onLayout: PropTypes.func,
    onPress: PropTypes.func,

    // Will be called, when user (directly) move the view.
    onMove: PropTypes.func,

    // Will be called, when user release the view.
    onRelease: PropTypes.func,
    onTerminate: PropTypes.func,
  };

  static defaultProps = {
    location: { x: 0, y: 0 },
    activationTime: 200,
  };

  state = {
    hasActive: false,
  };

  _unmounted = false;

  _panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      this.props.onTouchStart && this.props.onTouchStart();
      return true;
    },
    onMoveShouldSetPanResponder: (e, gestureState) => {
      if (this.props.disabled) {
        return false;
      }
      const vy = Math.abs(gestureState.vy);
      const vx = Math.abs(gestureState.vx);
      return (
        this.state.hasActive && (this.props.horizontal ? vx > vy : vy > vx)
      );
    },
    onShouldBlockNativeResponder: () => {
      // Returns whether this component should block native components from becoming the JS
      // responder. Returns true by default. Is currently only supported on android.
      // NOTE: Returning false here allows us to scroll unless it's a long press on a row.
      return false;
    },

    onPanResponderGrant: (e, gestureState) => {
      e.persist();

      this._target = e.nativeEvent.target;

      if (this.props.manuallyActivateRows) {
        return;
      }

      if (this.props.disabled) {
        return;
      }

      if (gestureState.numberActiveTouches > 1) {
        return;
      }

      this._longPressTimer = setTimeout(() => {
        if (this.state.hasActive) {
          return;
        }

        this._toggleActive(e);
      }, this.props.activationTime);
    },

    onPanResponderMove: (e, gestureState) => {
      if (this.props.disabled) {
        return;
      }
      if (
        !this.state.hasActive ||
        gestureState.numberActiveTouches > 1 ||
        e.nativeEvent.target !== this._target
      ) {
        if (!this._isTouchInsideElement(e)) {
          this._cancelLongPress();
        }

        return;
      }

      if (this.props.onMove) {
        this.props.onMove(e, gestureState);
      }
    },

    onPanResponderRelease: (e, gestureState) => {
      if (this.state.hasActive) {
        this._toggleActive(e, gestureState);
      } else {
        this._cancelLongPress();

        if (this._isTouchInsideElement(e) && this.props.onPress) {
          this.props.onPress();
        }
      }
    },

    // 不清楚为什么不走进来
    onPanResponderTerminationRequest: () => {
      if (this.state.hasActive) {
        // If a view is active do not release responder.
        return false;
      }

      this._cancelLongPress();

      return true;
    },

    onPanResponderTerminate: () => {
      this._cancelLongPress();

      // If responder terminated while dragging,
      // deactivate the element and move to the initial location.
      if (this.state.hasActive && !this._unmounted) {
        this.setState({
          hasActive: false,
        });
        this.props.onTerminate && this.props.onTerminate();
      }
    },
  });

  shouldComponentUpdate(nextProps) {
    return (
      this.props.disabled !== nextProps.disabled ||
      this.props.children !== nextProps.children
    );
  }

  componentWillUnmount() {
    this._unmounted = true;
  }

  render() {
    const { children, horizontal } = this.props;
    const rowStyle = [
      horizontal ? styles.horizontalContainer : styles.verticalContainer,
      this.state.hasActive ? { width: 0, height: 0 } : {},
    ];
    return (
      <View
        {...this._panResponder.panHandlers}
        style={rowStyle}
        onLayout={this._onLayout}
      >
        {this.state.hasActive
          ? null
          : this.props.manuallyActivateRows && children
          ? cloneElement(children, {
              toggleRowActive: this._toggleActive,
            })
          : children}
      </View>
    );
  }

  _cancelLongPress() {
    clearTimeout(this._longPressTimer);
  }

  _toggleActive = e => {
    if (this._unmounted) {
      return;
    }

    const callback = this.state.hasActive
      ? this.props.onRelease
      : this.props.onActivate;

    if (callback) {
      callback(e);
    }
    this.setState({
      hasActive: !this.state.hasActive,
    });
  };

  _mapGestureToMove(prevGestureState, gestureState) {
    return this.props.horizontal
      ? { dx: gestureState.moveX - prevGestureState.moveX }
      : { dy: gestureState.moveY - prevGestureState.moveY };
  }

  _isTouchInsideElement({ nativeEvent }) {
    return (
      this._layout &&
      nativeEvent.locationX >= 0 &&
      nativeEvent.locationX <= this._layout.width &&
      nativeEvent.locationY >= 0 &&
      nativeEvent.locationY <= this._layout.height
    );
  }

  _onLayout = e => {
    this._layout = e.nativeEvent.layout;

    if (this.props.onLayout) {
      this.props.onLayout(e);
    }
  };
}

const styles = StyleSheet.create({
  horizontalContainer: {
    top: 0,
    bottom: 0,
  },
  verticalContainer: {
    left: 0,
    right: 0,
  },
});

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  UIManager,
  View,
  ViewPropTypes,
  findNodeHandle,
} from 'react-native';
import { shallowEqual } from './utils';
import Row from './Row';

const AUTOSCROLL_INTERVAL = 50;
const ZINDEX = Platform.OS === 'ios' ? 'zIndex' : 'elevation';
const EMPTY_LAYOUT = {
  width: 0,
  height: 0,
};

function uniqueRowKey(key) {
  return `${key}-${uniqueRowKey.id}`;
}

uniqueRowKey.id = 0;

export default class SortableList extends Component {
  static propTypes = {
    data: PropTypes.array.isRequired,
    order: PropTypes.arrayOf(PropTypes.any),
    style: ViewPropTypes.style,
    itemWidthOrHeight: PropTypes.number.isRequired,
    separatorWidthOrHeight: PropTypes.number.isRequired,
    contentContainerStyle: ViewPropTypes.style,
    innerContainerStyle: ViewPropTypes.style,
    sortingEnabled: PropTypes.bool,
    scrollEnabled: PropTypes.bool,
    horizontal: PropTypes.bool,
    showsVerticalScrollIndicator: PropTypes.bool,
    showsHorizontalScrollIndicator: PropTypes.bool,
    refreshControl: PropTypes.element,
    autoScrollAreaSize: PropTypes.number,
    rowActivationTime: PropTypes.number,
    manuallyActivateRows: PropTypes.bool,
    initialScrollIndex: PropTypes.number,
    hasNested: PropTypes.bool,

    renderRow: PropTypes.func.isRequired,
    renderHeader: PropTypes.func,
    renderFooter: PropTypes.func,
    renderSeparator: PropTypes.func,

    onChangeOrder: PropTypes.func,
    onActivateRow: PropTypes.func,
    onReleaseRow: PropTypes.func,
    onPressRow: PropTypes.func,
    onTouchStart: PropTypes.func,
  };

  static defaultProps = {
    sortingEnabled: true,
    scrollEnabled: true,
    hasNested: false,
    horizontal: false,
    initialScrollIndex: 0,
    autoScrollAreaSize: 60,
    itemWidthOrHeight: 0,
    separatorWidthOrHeight: 0,
    manuallyActivateRows: false,
    showsVerticalScrollIndicator: true,
    showsHorizontalScrollIndicator: true,
    renderHeader: () => <View />,
    renderFooter: () => <View />,
    renderSeparator: () => <View />,
  };

  // Stores refs to rows’ components by keys.
  _rows = {};

  _contentOffset = { x: 0, y: 0 };
  _autoScrolling = false;
  _movingNativeEvent = null;

  _listLayout = EMPTY_LAYOUT;
  _headerLayout = EMPTY_LAYOUT;
  _footerLayout = EMPTY_LAYOUT;

  _unmounted = false;
  _hasActive = false;
  // rn0.61.4导致separator的leadingItem不是设计之初的递增关系，交换位置后就会异常
  _separatorCount = -1;

  constructor(props) {
    super(props);
    const { horizontal, itemWidthOrHeight, separatorWidthOrHeight } = props;
    this._rowLayout = {
      width: horizontal ? itemWidthOrHeight : 0,
      height: horizontal ? 0 : itemWidthOrHeight,
    };
    this._separatorLayout = {
      width: horizontal ? separatorWidthOrHeight : 0,
      height: horizontal ? 0 : separatorWidthOrHeight,
    };
    this.state = {
      order: this.props.order || Object.keys(this.props.data),
      data: this.props.data,
      activeRowKey: null,
      activeRowIndex: null,
      releasedRowKey: null,
      movingIndex: null,
      floatItemMargin: { x: 0, y: 0 },
      sortingEnabled: this.props.sortingEnabled,
      scrollEnabled: this.props.scrollEnabled,
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { data, order } = this.state;
    let { data: nextData, order: nextOrder } = nextProps;

    if (data && nextData && !shallowEqual(data, nextData)) {
      nextOrder = nextOrder || Object.keys(nextData);
      uniqueRowKey.id++;
      if (Object.keys(nextData).length !== Object.keys(data).length) {
        this.setState({
          data: nextData,
          order: nextOrder,
        });
      } else {
        this.setState({
          data: nextData,
          order: nextOrder,
        });
      }
    } else if (order && nextOrder && !shallowEqual(order, nextOrder)) {
      this.setState({ order: nextOrder });
    }
  }

  componentDidMount() {
    this._unmounted = false;
    const {
      initialScrollIndex,
      itemWidthOrHeight,
      separatorWidthOrHeight,
      hasNested,
    } = this.props;
    setTimeout(() => {
      if (!hasNested && this._list) {
        this._list.scrollToOffset({
          offset:
            (itemWidthOrHeight + separatorWidthOrHeight) * initialScrollIndex,
          animated: false,
        });
      }
    }, 0);
  }

  componentWillUnmount() {
    this._unmounted = true;
  }

  render() {
    let {
      contentContainerStyle,
      horizontal,
      style,
      showsVerticalScrollIndicator,
      showsHorizontalScrollIndicator,
    } = this.props;
    const {
      scrollEnabled,
      order,
      activeRowKey,
      activeRowIndex,
      floatItemMargin,
    } = this.state;
    this._separatorCount = -1;
    const containerStyle = StyleSheet.flatten([style]);
    let { refreshControl } = this.props;

    if (refreshControl && refreshControl.type === RefreshControl) {
      refreshControl = React.cloneElement(this.props.refreshControl, {
        enabled: scrollEnabled, // fix for Android
      });
    }
    let activeFloatItem = null;
    if (activeRowKey) {
      const extraStyle = horizontal
        ? { height: '100%', marginLeft: floatItemMargin.x }
        : {
            width: '100%',
            marginTop: floatItemMargin.y,
          };
      activeFloatItem = (
        <View style={[styles.selectedItem, extraStyle]}>
          {this._renderItem({ item: activeRowKey, index: activeRowIndex })}
        </View>
      );
    }
    return (
      <View style={containerStyle} ref={this._onRefContainer}>
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={contentContainerStyle}
          ref={this._onRefListView}
          horizontal={horizontal}
          onLayout={this._onLayoutList}
          scrollEventThrottle={2}
          scrollEnabled={scrollEnabled}
          showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          onScroll={this._onScroll}
          getItemLayout={this._getItemLayout}
          removeClippedSubviews={true}
          keyExtractor={(item, index) => uniqueRowKey(index)}
          data={order}
          ItemSeparatorComponent={this._renderSeparator}
          ListHeaderComponent={this._renderHeader}
          ListFooterComponent={this._renderFooter}
          renderItem={this._renderItem}
        />
        {activeFloatItem}
      </View>
    );
  }

  _getItemLayout = (data, index) => {
    const { itemWidthOrHeight, separatorWidthOrHeight } = this.props;
    return {
      length: itemWidthOrHeight,
      offset: (itemWidthOrHeight + separatorWidthOrHeight) * index,
      index,
    };
  };

  //order作为list数据源
  _renderItem = ({ item, index }) => {
    const {
      horizontal,
      rowActivationTime,
      sortingEnabled,
      renderRow,
      onTouchStart,
    } = this.props;
    const { data, activeRowKey, releasedRowKey } = this.state;
    const style = { [ZINDEX]: 0 };
    const active = activeRowKey === item;
    const released = releasedRowKey === item;
    if (active || released) {
      style[ZINDEX] = 100;
    }

    return (
      <Row
        key={uniqueRowKey(item)}
        ref={this._onRefRow.bind(this, item)}
        horizontal={horizontal}
        activationTime={rowActivationTime}
        animated={!active}
        disabled={!sortingEnabled}
        style={style}
        onLayout={this._onLayoutRow.bind(this)}
        onActivate={this._onActivateRow.bind(this, item, index)}
        onPress={this._onPressRow.bind(this, item)}
        onRelease={this._onReleaseRow.bind(this, item, index)}
        onTouchStart={onTouchStart}
        onMove={this._onMoveRow}
        onTerminate={this._onTerminateRow}
      >
        {renderRow({
          item,
          data: data[item],
          disabled: !sortingEnabled,
          active,
          index,
        })}
      </Row>
    );
  };

  _renderSeparator = () => {
    this._separatorCount++;
    const { horizontal, data } = this.props;
    const { movingIndex, activeRowIndex } = this.state;
    const leadingIndex = this._separatorCount;
    //假如movingIndex和activeIndex不一致，说明移动在别的位置，将自己的separator清除
    if (
      movingIndex !== null &&
      movingIndex !== activeRowIndex &&
      leadingIndex === activeRowIndex
    ) {
      return null;
    }
    //假如active是最后一个而moving不是 需要把倒数第二个的separator清除 因为它变成了最后一个 没有separator
    if (
      movingIndex !== null &&
      activeRowIndex === data.length - 1 &&
      movingIndex !== data.length - 1 &&
      leadingIndex === data.length - 2
    ) {
      return null;
    }
    let addFrontExtraSeparator = false;
    let addEndExtraSeparator = false;
    let extraStyle = {};
    if (movingIndex >= activeRowIndex) {
      const marginLeft =
        leadingIndex === movingIndex ? this._rowLayout.width : 0;
      const marginTop =
        leadingIndex === movingIndex ? this._rowLayout.height : 0;
      extraStyle = horizontal ? { marginLeft } : { marginTop };
      addFrontExtraSeparator =
        leadingIndex === movingIndex && movingIndex !== activeRowIndex;
      addEndExtraSeparator = false;
    } else {
      const marginRight =
        leadingIndex === movingIndex - 1 ? this._rowLayout.width : 0;
      const marginBottom =
        leadingIndex === movingIndex - 1 ? this._rowLayout.height : 0;
      extraStyle = horizontal ? { marginRight } : { marginBottom };
      addFrontExtraSeparator = false;
      addEndExtraSeparator = leadingIndex === movingIndex - 1;
    }

    const style = [
      {
        flexDirection: horizontal ? 'row' : 'column',
      },
      extraStyle,
    ];
    return (
      <View
        key={uniqueRowKey('separator' + leadingIndex)}
        style={{ flexDirection: horizontal ? 'row' : 'column' }}
        onLayout={this._onLayoutSeparator}
      >
        {addFrontExtraSeparator
          ? this.props.renderSeparator(leadingIndex)
          : null}
        <View style={style}>
          {this.props.renderSeparator(leadingIndex + 1)}
        </View>
        {addEndExtraSeparator ? this.props.renderSeparator(leadingIndex) : null}
      </View>
    );
  };

  _renderHeader = () => {
    const { horizontal, renderHeader, renderSeparator } = this.props;
    const { movingIndex, activeRowIndex } = this.state;
    let style = {};
    let renderExtraSeparator = false;
    if (movingIndex !== null && movingIndex === 0 && activeRowIndex !== 0) {
      style = horizontal
        ? { marginRight: this._rowLayout.width || 0 }
        : { marginTop: this._rowLayout.height || 0 };
      renderExtraSeparator = !!renderSeparator;
    }
    return (
      <View
        style={{ flexDirection: horizontal ? 'row' : 'column' }}
        onLayout={this._onLayoutHeader}
      >
        <View style={style}>{renderHeader()}</View>
        {renderExtraSeparator ? renderSeparator() : null}
      </View>
    );
  };

  _renderFooter = () => {
    //避免flatlist组件内渲染导致计数器异常 这里多做一次重置
    this._separatorCount = -1;
    const { horizontal, renderFooter, renderSeparator } = this.props;
    const { footerLayout, movingIndex, activeRowIndex } = this.state;
    let style = {};
    let renderExtraSeparator = false;
    if (movingIndex !== null && movingIndex === this.props.data.length - 1) {
      style = horizontal
        ? { marginLeft: this._rowLayout.width || 0 }
        : { marginTop: this._rowLayout.height || 0 };
      renderExtraSeparator =
        !!renderSeparator && activeRowIndex !== this.props.data.length - 1;
    }
    return (
      <View
        style={{ flexDirection: horizontal ? 'row' : 'column' }}
        onLayout={!footerLayout ? this._onLayoutFooter : null}
      >
        {renderExtraSeparator ? renderSeparator() : null}
        <View style={style}>{renderFooter()}</View>
      </View>
    );
  };

  _checkAutoScroll = offset => {
    if (!this._shouldScroll(offset)) {
      this._autoScrolling && this._stopAutoScroll();
      return;
    }
    if (this._autoScrolling) {
      return;
    }
    const { horizontal, autoScrollAreaSize } = this.props;
    const direction =
      (horizontal ? offset.x : offset.y) < autoScrollAreaSize ? -1 : 1;
    this._startAutoScroll(direction);
  };

  _shouldScroll = offset => {
    const { horizontal, autoScrollAreaSize } = this.props;
    if (horizontal) {
      return (
        offset.x < autoScrollAreaSize ||
        this._listLayout.width - offset.x - this._rowLayout.width <
          autoScrollAreaSize
      );
    } else {
      return (
        offset.y < autoScrollAreaSize ||
        this._listLayout.height - offset.y - this._rowLayout.height <
          autoScrollAreaSize
      );
    }
  };

  _getEveryStepOffset = () => {
    const { horizontal } = this.props;
    return (horizontal ? this._rowLayout.width : this._rowLayout.height) * 0.25;
  };

  _scroll(animated) {
    const rowsWidth =
      this.props.data.length === 0
        ? 0
        : (this._rowLayout.width + this._separatorLayout.width) *
            this.props.data.length -
          this._separatorLayout.width;
    const rowsHeight =
      this.props.data.length === 0
        ? 0
        : (this._rowLayout.height + this._separatorLayout.height) *
            this.props.data.length -
          this._separatorLayout.height;
    const contentSizeW =
      this._headerLayout.width + this._footerLayout.width + rowsWidth;
    const contentSizeH =
      this._headerLayout.height + this._footerLayout.height + rowsHeight;
    const maxContentOffsetX =
      contentSizeW - this._listLayout.width < 0
        ? 0
        : contentSizeW - this._listLayout.width;
    const maxContentOffsetY =
      contentSizeH - this._listLayout.height < 0
        ? 0
        : contentSizeH - this._listLayout.width;
    this._contentOffset.x =
      this._contentOffset.x > maxContentOffsetX
        ? maxContentOffsetX
        : this._contentOffset.x;
    this._contentOffset.x =
      this._contentOffset.x < 0 ? 0 : this._contentOffset.x;
    this._contentOffset.y =
      this._contentOffset.y > maxContentOffsetY
        ? maxContentOffsetY
        : this._contentOffset.y;
    this._contentOffset.y =
      this._contentOffset.y < 0 ? 0 : this._contentOffset.y;
    this._list &&
      this._list.scrollToOffset({
        offset: this.props.horizontal
          ? this._contentOffset.x
          : this._contentOffset.y,
        animated,
      });
  }

  scrollBy({ dx = 0, dy = 0, animated = false }) {
    if (this.props.horizontal) {
      this._contentOffset.x += dx;
    } else {
      this._contentOffset.y += dy;
    }

    this._scroll(animated);
  }

  scrollTo({ x = 0, y = 0, animated = false }) {
    if (this.props.horizontal) {
      this._contentOffset.x = x;
    } else {
      this._contentOffset.y = y;
    }

    this._scroll(animated);
  }

  _startAutoScroll(direction) {
    const { horizontal } = this.props;
    this._autoScrolling = true;
    // let count = 0;

    this._autoScrollInterval = setInterval(() => {
      const movement = {
        [horizontal ? 'dx' : 'dy']: direction * this._getEveryStepOffset(),
      };
      this.scrollBy(movement);
      // 加这部分代码可以让movingIndex在自动scroll的时候计算
      // if(count % 8 === 0){
      //   this.setState({
      //     movingIndex: this._measure(this._movingNativeEvent),
      //   });
      // }
      // count++;
    }, AUTOSCROLL_INTERVAL);
  }

  _stopAutoScroll() {
    this._autoScrolling = false;
    clearInterval(this._autoScrollInterval);
    this._autoScrollInterval = null;
  }

  //params:激活的row的order和index 激活时候抛出来的原生事件
  _onActivateRow = (rowKey, index, e) => {
    if (this._unmounted) {
      return;
    }

    this._hasActive = true;
    this.setState({
      releasedRowKey: null,
      scrollEnabled: false,
    });
    const { pageX: evtPageX, pageY: evtPageY } = e.nativeEvent;
    // 计算好布局后再设置active 防止UI异常
    UIManager.measure(
      findNodeHandle(this._list),
      (x, y, width, height, pageX, pageY) => {
        this._listLayout = { x, y, width, height, pageX, pageY };
        if (!this._hasActive) {
          return;
        }
        this.setState({
          activeRowKey: rowKey,
          floatItemMargin: this._getFloatItemMargin(
            evtPageX - pageX,
            evtPageY - pageY,
            width,
            height
          ),
          activeRowIndex: index,
          movingIndex: index,
        });
      }
    );

    if (this.props.onActivateRow) {
      this.props.onActivateRow(rowKey);
    }
  };

  _onMoveRow = e => {
    this._movingNativeEvent = e.nativeEvent;
    if (!this._rowLayout || !this._footerLayout || !this._headerLayout) {
      return;
    }
    this._movingMeasureIndex(e.nativeEvent);
  };

  _movingMeasureIndex = e => {
    //return null;
    const { width, height, pageX, pageY } = this._listLayout;
    if (!this._hasActive || this._unmounted) {
      return;
    }
    this.setState(
      {
        movingIndex: this._measure(e),
        floatItemMargin: this._getFloatItemMargin(
          e.pageX - pageX,
          e.pageY - pageY,
          width,
          height
        ),
      },
      () => {
        !this.props.hasNested &&
          this._checkAutoScroll(this.state.floatItemMargin);
      }
    );
  };

  // 核心方法 计算moving的时候所对应的的index
  _measure = e => {
    if (!e || !this._listLayout) {
      return this.state.activeRowIndex;
    }
    const { horizontal, hasNested } = this.props;
    const { pageX: evtPageX, pageY: evtPageY } = e;
    const { width, height, pageX, pageY } = this._listLayout;
    const contentOffset = horizontal
      ? this._contentOffset.x
      : hasNested
      ? 0
      : this._contentOffset.y;
    if (horizontal) {
      const pointerOffsetInList =
        evtPageX - pageX > width ? width : evtPageX - pageX;
      const index =
        Math.ceil(
          (pointerOffsetInList + contentOffset - this._headerLayout.width) /
            (this._rowLayout.width + this._separatorLayout.width)
        ) - 1;
      return index >= this.props.data.length
        ? this.props.data.length - 1
        : index < 0
        ? 0
        : index;
    } else {
      const pointerOffsetInList =
        evtPageY - pageY > height ? height : evtPageY - pageY;
      const index =
        Math.ceil(
          (pointerOffsetInList + contentOffset - this._headerLayout.height) /
            (this._rowLayout.height + this._separatorLayout.height)
        ) - 1;
      return index >= this.props.data.length
        ? this.props.data.length - 1
        : index < 0
        ? 0
        : index;
    }
  };

  _onTerminateRow = () => {
    this._hasActive = false;
    this._movingNativeEvent = null;
    if (this._unmounted) {
      return;
    }
    this.setState({
      activeRowKey: null,
      activeRowIndex: null,
      movingIndex: null,
      releasedRowKey: this.state.activeRowKey,
      scrollEnabled: this.props.scrollEnabled,
    });
    this.props.onReleaseRow && this.props.onReleaseRow(null, this.state.order);
  };

  _onReleaseRow = (rowKey, index) => {
    if (this._unmounted) {
      return;
    }

    //保证了释放的时候移动的位置正确
    this._hasActive = false;
    const desIndex = this._measure(this._movingNativeEvent);
    this.setState(
      {
        movingIndex: desIndex !== null ? desIndex : index,
        releasedRowKey: rowKey,
      },
      () => {
        this._autoScrolling && this._stopAutoScroll();
        this._movingNativeEvent = null;
        const { activeRowIndex, movingIndex } = this.state;
        let newOrder = this.state.order.slice();
        if (activeRowIndex !== null) {
          const needMovedItems = newOrder.splice(activeRowIndex, 1);
          newOrder.splice(movingIndex, 0, needMovedItems[0]);
        }
        this.setState({
          activeRowKey: null,
          activeRowIndex: null,
          movingIndex: null,
          order: newOrder,
          scrollEnabled: this.props.scrollEnabled,
        });
        this.props.onChangeOrder && this.props.onChangeOrder(newOrder);
        this.props.onReleaseRow && this.props.onReleaseRow(rowKey, newOrder);
      }
    );
  };

  _onPressRow = rowKey => {
    if (this.props.onPressRow) {
      this.props.onPressRow(rowKey);
    }
  };

  _getFloatItemMargin = (moveX, moveY, listWidth, listHeight) => {
    const marginLeft = moveX - this._rowLayout.width / 2;
    const maxMarginLeft = listWidth - this._rowLayout.width;
    const x =
      marginLeft < 0
        ? 0
        : marginLeft > maxMarginLeft
        ? maxMarginLeft
        : marginLeft;
    const marginTop = moveY - this._rowLayout.height / 2;
    const maxMarginTop = listHeight - this._rowLayout.height;
    const y =
      marginTop < 0 ? 0 : marginTop > maxMarginTop ? maxMarginTop : marginTop;
    return { x, y };
  };

  _onScroll = ({ nativeEvent: { contentOffset } }) => {
    this._contentOffset = contentOffset;
  };

  _onRefContainer = component => {
    this._container = component;
  };

  _onRefListView = component => {
    this._list = component;
  };

  _onRefRow = (rowKey, component) => {
    this._rows[rowKey] = component;
  };

  _onLayoutRow = ({ nativeEvent: { layout } }) => {
    if (this.state.activeRowIndex === null) {
      this._rowLayout = layout;
    }
  };

  _onLayoutHeader = ({ nativeEvent: { layout } }) => {
    if (this.state.activeRowIndex === null) {
      this._headerLayout = layout;
    }
  };

  _onLayoutFooter = ({ nativeEvent: { layout } }) => {
    if (this.state.activeRowIndex === null) {
      this._footerLayout = layout;
    }
  };

  _onLayoutSeparator = ({ nativeEvent: { layout } }) => {
    if (this.state.activeRowIndex === null) {
      this._separatorLayout = layout;
    }
  };

  _onLayoutList = () => {
    if (this.state.activeRowIndex === null) {
      UIManager.measure(
        findNodeHandle(this._list),
        (x, y, width, height, pageX, pageY) => {
          this._listLayout = { x, y, width, height, pageX, pageY };
        }
      );
    }
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rowsContainer: {
    flex: 1,
    zIndex: 1,
  },
  selectedItem: {
    position: 'absolute',
  },
});

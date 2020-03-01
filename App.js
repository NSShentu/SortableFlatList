/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component, PureComponent } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Dimensions
} from 'react-native';

import SortableList from './SortableList';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default class App extends Component {

  _renderRow = ({item,data, disable,index,active})=>{
    return(
      <View style={[styles.row,{backgroundColor: data.color}]}>
        <Text>{data.name}</Text>
      </View>
    )
  };

  _renderSeparator = ()=>{
    return(
      <View style={styles.sep}/>
    )
  };

  _renderFooter = ()=>{
    return(
      <View style={styles.footer}>
        <Text>FOOTER</Text>
      </View>
    );
  };

  _changeOrder = ()=>{

  };

  _onActiveRow = ()=>{

  };

  _onReleaseRow = ()=>{

  };

  render(){
    const dataRes = [...Array(100).keys()].map(item =>{
      const colorFactors = [1,2,3].map(()=> Math.random()*150+50);
      const color = `rgba(${colorFactors[0]},${colorFactors[1]},${colorFactors[2]},0.5)`;
      return {color,name: item}
    });
    return (
      <View style={styles.container}>
        <SortableList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 80 }}
          data={dataRes}
          sortingEnabled={true}
          itemWidthOrHeight={50}
          separatorWidthOrHeight={1}
          renderRow={this._renderRow}
          renderSeparator={this._renderSeparator}
          renderFooter={this._renderFooter}
          onChangeOrder={this._changeOrder}
          onActivateRow={this._onActiveRow}
          onReleaseRow={this._onReleaseRow}
        />
      </View>
    );
  }

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  },
  row: {
    width: "100%",
    height: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sep: {
    width: SCREEN_WIDTH - 40,
    height: 1,
    backgroundColor: '#828282',
    marginLeft: 20
  },
  footer: {
    backgroundColor: 'beige',
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center'
  }
});



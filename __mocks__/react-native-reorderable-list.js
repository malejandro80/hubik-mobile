const { FlatList } = require('react-native');
const React = require('react');

module.exports = {
  __esModule: true,
  default: (props) =>
    React.createElement(FlatList, {
      data: props.data,
      keyExtractor: props.keyExtractor,
      renderItem: props.renderItem,
    }),
  useReorderableDrag: () => () => undefined,
};

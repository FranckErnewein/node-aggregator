#Data aggregation tool

[![npm version](https://badge.fury.io/js/node-aggregator.svg)](http://badge.fury.io/js/node-aggregator)

usefull to manage cache and keed updated

## Example

### Basic
```javascript
var sum = new Aggregator(function(new_value, memo, callback){
  callback(new_value + memo); 
}, 0);

sum.add(1);
console.log(sum.value()); // => 1;
sum.add(2);
console.log(sum.value()); // => 3;
```


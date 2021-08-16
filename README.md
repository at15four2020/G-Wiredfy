# G-Wiredfy
Node.js G-Earth library to do any client side task with a Wired-like language

## Usage

After creating your extension with G-Node, pass it to `Wiredfy` and store the result.

```js
const {
	init,
	exit,
	when,
	actions,
	props,
	utils,
} = Wiredfy(ext)
```

When the connection between your extension and G-Earth succeed, run `init` to start the basics operations. Only after that, you can use the blocks.

```js
ext.on('connect', async (host, connectionPort, hotelVersion, clientIdentifier, clientType) => {
    await init()
    
    // ...
})
```

### Syntax

```when(<trigger>)(.if(<condition>))*.do(<effect>)```

## Examples

### Basic movement

```js
when(props.me().inPlace(10, 4))
  .do(actions.walkTo(9, 4))
```

### Basic object state change

```js
when(props.object(123456789).changeState())
  .do(actions.walkTo(9, 4)
```

### Basic condition

```js
when(props.object(123456789).changeState())
  .if(props.me().inPlace(6, 4))
  .do(actions.walkTo(9, 4)
```

### Full list

Code|Used as
-|-
`props.object(uId).changeState()`|Trigger
`utils.every(timeout)`|Trigger
`props.me().inPlace(x, y)`|Trigger, Condition
`actions.walkTo(x, y)`|Effect
`actions.say(message, style = 7)`|Effect
`actions.shout(message, style = 7)`|Effect
`actions.wave()`|Effect
`actions.dance(style = 1)`|Effect
`actions.sit()`|Effect
`actions.stand()`|Effect
`utils.wait(delay).then(effect)`|Effect
`utils.all(effectList)`|Effect
`utils.all(effectList)`|Effect

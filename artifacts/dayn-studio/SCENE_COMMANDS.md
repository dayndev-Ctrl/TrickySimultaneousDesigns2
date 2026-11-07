# Scene command interface

This demo is not connected to ChatGPT or an AI provider. There are no browser API
keys. A future server-side assistant can generate structured commands and submit
them, after user approval, through `executeSceneCommand(state, input)`.

The editor and any future adapter must share this mutation boundary. The function
accepts untrusted parsed JSON and returns `{ok, state, message}`. On rejection,
the original state is returned unchanged. No code, URLs, scripts, or arbitrary
Three.js properties can be submitted.

## Commands

```json
{"type":"add","primitive":"sphere","position":[2,0.75,0],"color":"#79c9b6"}
```

```json
{"type":"select","id":"cube-1"}
```

```json
{"type":"update","id":"cube-1","position":[0,1,0],"rotation":[0,45,0],"scale":[1,2,1],"color":"#f2ba79","name":"Tall cube"}
```

```json
{"type":"delete","id":"cube-1"}
```

Use `{"type":"select","id":null}` to clear selection. `add` supports `cube`,
`sphere`, `cylinder`, and `plane`. Its color and position are optional. `update`
supports any subset of the shown editable properties; IDs come from scene state.

Positions are world units in [-1000, 1000], rotations are degrees in
[-36000, 36000], and scales are positive values in [0.01, 100]. All vectors
contain exactly three finite numbers. Colors require six-digit hex notation.
Scenes are limited to 100 editable objects. Unknown commands and fields fail
explicitly. The visual ground, lighting, camera, and editor helpers are not
editable scene objects.

An eventual AI service must keep credentials server-side and treat its output as
untrusted input to this validator. This interface is local application code, not
a remote API, global browser bridge, or connection to the current conversation.

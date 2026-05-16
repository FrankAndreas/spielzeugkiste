export function createHistory(initial) {
  const stack  = [JSON.parse(JSON.stringify(initial))]
  let pointer  = 0

  return {
    current: ()  => JSON.parse(JSON.stringify(stack[pointer])),
    canUndo: ()  => pointer > 0,
    canRedo: ()  => pointer < stack.length - 1,
    push(state) {
      stack.splice(pointer + 1)
      stack.push(JSON.parse(JSON.stringify(state)))
      pointer = stack.length - 1
    },
    undo() {
      if (pointer > 0) pointer--
    },
    redo() {
      if (pointer < stack.length - 1) pointer++
    },
  }
}

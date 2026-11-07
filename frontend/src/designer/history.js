// Undo/redo over serialised design snapshots (one History per shirt side).
export class History {
  constructor(limit = 50) {
    this.limit = limit
    this.stack = []
    this.index = -1
  }

  reset(snapshot) {
    this.stack = [snapshot]
    this.index = 0
  }

  push(snapshot) {
    if (this.stack[this.index] === snapshot) return
    this.stack = this.stack.slice(0, this.index + 1)
    this.stack.push(snapshot)
    if (this.stack.length > this.limit) this.stack.shift()
    this.index = this.stack.length - 1
  }

  undo() {
    if (!this.canUndo) return null
    this.index -= 1
    return this.stack[this.index]
  }

  redo() {
    if (!this.canRedo) return null
    this.index += 1
    return this.stack[this.index]
  }

  get canUndo() {
    return this.index > 0
  }

  get canRedo() {
    return this.index < this.stack.length - 1
  }
}

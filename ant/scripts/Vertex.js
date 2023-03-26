export class Vertex {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.adjacency = []
    this.phero = 0
  }

  addAdjacency(index) {
    if (!this.adjacency.includes(index)) {
      this.adjacency.push(+index)
    }
  }
}

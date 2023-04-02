import { getCellIndexes, getNextPoint, getRandom } from './helpers.js'

export class Ant {
    constructor(colony, id, x, y, row, column, maxRow, maxColumn, angle) {
        this.colony = colony
        this.id = id
        this.x = x
        this.y = y
        this.row = row
        this.column = column
        this.radius = 2
        this.angle = angle
        this.alfa = 1
        this.beta = 1
        this.maxRow = maxRow
        this.maxColumn = maxColumn
        this.food = 0
        this.nextPoint = { row: this.row, column: this.column, x: this.x, y: this.y }
        this.distanceToFood = 0
        this.distanceToHome = 0
        this.pathFromHome = []
        this.goHome = false
        this.isHero = false
    }

    draw(context, cells, pxPerCell) {
        const color = cells[this.row][this.column].color

        context.beginPath()
        context.save()
        context.fillStyle = color
        context.arc(this.x, this.y, this.radius + 0.2, 0, Math.PI * 2)
        context.fill()
        context.restore()

        this.x = this.nextPoint.x
        this.y = this.nextPoint.y
        this.row = this.nextPoint.row
        this.column = this.nextPoint.column

        context.beginPath()
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        context.fill()
    }

    comeBackHome(cells, pxPerCell, context) {
        if (this.pathFromHome.length <= 1) {
            this.colony.food += this.food
            this.food = 0
            this.pathFromHome = []
            this.goHome = false
            this.isHero = false
            this.distanceToFood = 0
            this.distanceToHome = 0
            return
        }

        this.distanceToFood += 1

        const a = this.pathFromHome.pop()
        cells[a.row][a.column].distanceToFood = Math.min(this.distanceToFood, cells[a.row][a.column].distanceToFood)

        cells[a.row][a.column].update(context)
        cells[a.row][a.column].visit(this)

        this.nextPoint.x = a.x
        this.nextPoint.y = a.y
        this.nextPoint.row = a.row
        this.nextPoint.column = a.column
    }

    updateDistances() {
        if (this.goHome) {
            this.distanceToFood += 1
        } else {
            this.distanceToHome += 1
        }
    }

    checkCoordinates(point, dis) {
        return point.x >= 0 && point.y >= 0 && point.x < this.maxColumn * dis && point.y < this.maxRow * dis
    }

    checkCell(cell) {
        return cell.row >= 0 && cell.column >= 0 && cell.row < this.maxRow && cell.column < this.maxColumn
    }

    getNeighbours(distance) {
        const arr = []
        const toWatch = distance * 2
        const angles = [getRandom(-10, 10), getRandom(45, 60), getRandom(-45, -60)]

        const direct = getNextPoint(this.x, this.y, toWatch, this.angle, angles[0])
        const left = getNextPoint(this.x, this.y, toWatch, this.angle, angles[1])
        const right = getNextPoint(this.x, this.y, toWatch, this.angle, angles[2])

        const directCell = getCellIndexes(direct.x, direct.y, distance)
        const leftCell = getCellIndexes(left.x, left.y, distance)
        const rightCell = getCellIndexes(right.x, right.y, distance)

        // if (directCell.row === leftCell.row && directCell.column === leftCell.column) debugger

        directCell.angle = angles[0]
        leftCell.angle = angles[1]
        rightCell.angle = angles[2]

        if (this.checkCoordinates(direct, distance) && this.checkCell(directCell)) arr.push({ ...directCell, ...direct })
        if (this.checkCoordinates(left, distance) && this.checkCell(leftCell)) arr.push({ ...leftCell, ...left })
        if (this.checkCoordinates(right, distance) && this.checkCell(rightCell)) arr.push({ ...rightCell, ...right })

        return arr
    }

    update(cells, pxPerCell, context) {
        if (this.isHero) this.comeBackHome(cells, pxPerCell, context)
        this.pathFromHome.push({ x: this.x, y: this.y, row: this.row, column: this.column })

        const neighbours = this.getNeighbours(pxPerCell)

        const turn = getNextPoint(this.x, this.y, pxPerCell, this.angle, 180)

        const turnCell = getCellIndexes(turn.x, turn.y, pxPerCell)

        const variants = []
        let fullP = 0

        // fill variants
        for (let i = 0; i < neighbours.length; i++) {
            const coordinate = neighbours[i]
            const row = coordinate.row
            const column = coordinate.column

            cells[row][column].update(context)
            const cell = cells[row][column]

            let pheromone = this.goHome ? cell.homeMarker : cell.foodMarker
            // let pheromone = this.goHome ? 1 : cell.foodMarker
            let distance = this.goHome ? cell.distanceToHome : cell.distanceToFood

            const p = Math.pow(1 / distance, this.alfa) * Math.pow(pheromone, this.beta)
            const variant = { ...cell, pheromone: pheromone, distance: distance, p: p, ...coordinate }

            variants.push(variant)
            fullP += p
        }

        // none variants, add turn 180 degres
        let idx = -1
        if (!variants.length) {
            const cell = cells[turnCell.row][turnCell.column]

            variants.push({ ...cell, ...turn, ...turnCell, angle: 180 })
            fullP = 1
            idx = 0
        }

        // fill probabilities of variants
        for (let i = 0; i < variants.length; i++) {
            variants[i].p = variants[i].p / fullP
        }

        // sort probabilities
        variants.sort((a, b) => a.p - b.p)

        // part on segments for random
        const probabilities = []
        let probabilitiesSum = variants[0].p

        probabilities.push({ from: 0, to: variants[0].p })

        for (let i = 0; i < variants.length - 1; i++) {
            const newP = variants[i + 1].p
            probabilities.push({ from: probabilitiesSum, to: probabilitiesSum + newP })
            probabilitiesSum += newP
        }

        // random 0 - 1
        const rand = Math.random()

        for (let i = 0; i < probabilities.length; i++) {
            const prob = probabilities[i]

            if (prob.from <= rand && prob.to > rand) {
                idx = i
                break
            }
        }

        // update ant
        const variant = variants[idx]

        // update food
        if (variant.isFood) {
            this.isHero = cells[variant.row][variant.column].visitFood()
            variant.row = turnCell.row
            variant.column = turnCell.column
            variant.angle = 180
            this.food = variant.foodBlock.amount
            this.goHome = true
        }

        if (variant.isHome) {
            this.colony.food += this.food
            this.food = 0
            this.goHome = false
            variant.row = turnCell.row
            variant.column = turnCell.column
            variant.angle = 180
            this.pathFromHome = []
            this.distanceToFood = 0
            this.distanceToHome = 0
        }

        this.updateDistances()

        this.angle += variant.angle
        const row = variant.row
        const column = variant.column
        const toCell = cells[row][column]

        const prevDistanceToHome = toCell.distanceToHome
        const prevDistanceToFood = toCell.distanceToFood
        cells[row][column].distanceToHome = !this.goHome ? Math.min(prevDistanceToHome, this.distanceToHome) : prevDistanceToHome
        cells[row][column].distanceToFood = this.goHome ? Math.min(prevDistanceToFood, this.distanceToFood) : prevDistanceToFood

        cells[row][column].visit(this)

        // update next point
        this.nextPoint.row = variant.row
        this.nextPoint.column = variant.column
        this.nextPoint.x = variant.x
        this.nextPoint.y = variant.y
    }
}

import { DecisionTree } from './DecisionTree.js'
import { drawTree } from './drawTree.js'
import { getLeafName, getVariantName } from './helpers.js'
import { prune } from './prune.js'

const inputFile = document.querySelector("input[name='readCsv']")
const createTreeBtn = document.querySelector('.createTree')
const newRow = document.querySelector('.newRow')
const confirmRow = document.querySelector('.confirmRow')
const fileRegex = new RegExp('(.*?).(csv)$', 'i')

inputFile.addEventListener('change', handleFile)
createTreeBtn.addEventListener('click', createTree)
confirmRow.addEventListener('click', confirmRowHandle)

newRow.value = '456,SUNNY,HOT,HIGH,WEAK'
inputFile.value = ''
const tree = new DecisionTree()
let smartTree
let fullData
let exampleRow

function handleFile(e) {
    const file = e.target.files[0]

    if (file && fileRegex.test(file.name)) {
        const reader = new FileReader()

        reader.onload = (e) => setTable(e.target.result)

        reader.readAsText(file)
    } else {
        e.target.vaule = ''
        alert('Error')
    }
}

function setTable(text) {
    const rows = text.split('\n')
    const headers = rows[0].split(',')
    const target = headers[headers.length - 1]
    const id = headers[0]

    const data = []

    for (let i = 1; i < rows.length; i++) {
        if (!rows[i]) continue

        const values = rows[i].split(',')
        const obj = new Map()

        for (let j = 0; j < headers.length; j++) {
            obj.set(headers[j], values[j])
        }

        if (exampleRow === undefined) exampleRow = new Map(obj)
        data.push(obj)
    }

    fullData = data
    tree.target = target
    tree.id = id
}

function createTree() {
    if (!tree.target) return

    smartTree = tree.createTree(fullData)
    prune(smartTree)
    drawTree(smartTree)
}

async function confirmRowHandle() {
    const divs = document.querySelectorAll('.rect')

    divs.forEach((rect) => {
        rect.classList.remove('selected')
    })

    if (smartTree === undefined) {
        return
    }

    const rowText = newRow.value
    const columns = rowText.split(',')
    const row = new Map()

    let i = 0

    exampleRow.forEach((value, column) => {
        row.set(column, columns[i])
        i++
    })

    let node = smartTree.it

    while (node.children.length) {
        const toQuestion = document.querySelector(`div[data-question=${node.question}]`)
        toQuestion.classList.add('selected')

        if (node.variant) {
            const toVariant = document.querySelector(`div[data-variant=${getVariantName(node)}]`)
            toVariant.classList.add('selected')
        }

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i]

            if (child.variant === row.get(node.question)) {
                node = child
                break
            }
        }
    }

    const lastVariant = document.querySelector(`div[data-variant=${getVariantName(node)}]`)
    lastVariant.classList.add('selected')
    const toTarget = document.querySelector(`div[data-question=${getLeafName(node)}]`)
    toTarget.classList.add('selected')
}

extension FlowLayout {
    /// Where what a group was spent on starts: it fans out like a tree. Each group's items get a gap between them and are
    /// centred on their group (so they may stand taller than it), then the groups' blocks are pushed apart where they
    /// would touch and back inside the diagram where they would run off its end. Centring the whole column instead bent
    /// every band towards the middle.
    static func treeTops(parents: [String], centers: [String: Double], heights: [Double], gap: Double, height: Double) -> [Double] {
        struct Block {
            let parent: String
            var items: [Int]
            var size = 0.0
            var top = 0.0
        }
        var blocks: [Block] = []
        for (index, parent) in parents.enumerated() {
            if let open = blocks.last, open.parent == parent {
                blocks[blocks.count - 1].items.append(index)
            } else {
                blocks.append(Block(parent: parent, items: [index]))
            }
        }
        for index in blocks.indices {
            let items = blocks[index].items
            blocks[index].size = items.reduce(0) { $0 + heights[$1] } + gap * Double(items.count - 1)
            blocks[index].top = centers[blocks[index].parent].map { $0 - blocks[index].size / 2 } ?? 0
        }
        var floor = 0.0
        for index in blocks.indices {
            blocks[index].top = max(blocks[index].top, floor)
            floor = blocks[index].top + blocks[index].size + gap
        }
        var ceiling = height
        for index in blocks.indices.reversed() {
            blocks[index].top = min(blocks[index].top, ceiling - blocks[index].size)
            ceiling = blocks[index].top - gap
        }
        var tops = [Double](repeating: 0, count: parents.count)
        for block in blocks {
            var y = block.top
            for item in block.items {
                tops[item] = y
                y += heights[item] + gap
            }
        }
        return tops
    }
}

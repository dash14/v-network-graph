import { describe, it, expect } from "vitest"
import { handleNodeLabelAutoAdjustment } from "@/modules/node/label"

describe("handleNodeLabelAutoAdjustment", () => {
  describe("avoid north", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node2", pos: { x: 100, y: 50 } }, // north
      },
      () => undefined,
      "north"
    )
    it("should be south", () => {
      expect(direction).to.be.equal("south")
    })
  })

  describe("avoid north-east", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node2", pos: { x: 100, y: 50 } }, // north
        edge2: { nodeId: "node3", pos: { x: 150, y: 50 } }, // north-east
      },
      () => undefined,
      "north"
    )
    it("should be south", () => {
      expect(direction).to.be.equal("south")
    })
  })

  describe("avoid north-west", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node2", pos: { x: 100, y: 50 } }, // north
        edge2: { nodeId: "node3", pos: { x: 150, y: 50 } }, // north-east
        edge3: { nodeId: "node4", pos: { x: 50, y: 50 } }, // north-west
      },
      () => undefined,
      "north"
    )
    it("should be south", () => {
      expect(direction).to.be.equal("south")
    })
  })

  describe("avoid east", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node2", pos: { x: 100, y: 50 } }, // north
        edge2: { nodeId: "node3", pos: { x: 150, y: 50 } }, // north-east
        edge3: { nodeId: "node4", pos: { x: 50, y: 50 } }, // north-west
        edge4: { nodeId: "node5", pos: { x: 150, y: 100 } }, // east
      },
      () => undefined,
      "south"
    )
    it("should be west", () => {
      expect(direction).to.be.equal("south")
    })
  })

  describe("avoid west", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node2", pos: { x: 100, y: 50 } }, // north
        edge2: { nodeId: "node3", pos: { x: 150, y: 50 } }, // north-east
        edge3: { nodeId: "node4", pos: { x: 50, y: 50 } }, // north-west
        edge4: { nodeId: "node5", pos: { x: 150, y: 100 } }, // east
        edge5: { nodeId: "node6", pos: { x: 50, y: 100 } }, // west
      },
      () => undefined,
      "north"
    )
    it("should be south", () => {
      expect(direction).to.be.equal("south")
    })
  })

  describe("avoid south", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node2", pos: { x: 100, y: 50 } }, // north
        edge2: { nodeId: "node3", pos: { x: 150, y: 50 } }, // north-east
        edge3: { nodeId: "node4", pos: { x: 50, y: 50 } }, // north-west
        edge4: { nodeId: "node5", pos: { x: 150, y: 100 } }, // east
        edge5: { nodeId: "node6", pos: { x: 50, y: 100 } }, // west
        edge6: { nodeId: "node7", pos: { x: 100, y: 150 } }, // south
      },
      () => undefined,
      "north"
    )
    it("should be south-east", () => {
      expect(direction).to.be.equal("south-east")
    })
  })

  describe("avoid south-east", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node2", pos: { x: 100, y: 50 } }, // north
        edge2: { nodeId: "node3", pos: { x: 150, y: 50 } }, // north-east
        edge3: { nodeId: "node4", pos: { x: 50, y: 50 } }, // north-west
        edge4: { nodeId: "node5", pos: { x: 150, y: 100 } }, // east
        edge5: { nodeId: "node6", pos: { x: 50, y: 100 } }, // west
        edge6: { nodeId: "node7", pos: { x: 100, y: 150 } }, // south
        edge7: { nodeId: "node8", pos: { x: 150, y: 150 } }, // south-east
      },
      () => undefined,
      "north"
    )
    it("should be south-west", () => {
      expect(direction).to.be.equal("south-west")
    })
  })

  describe("avoid south-west -> use default", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node2", pos: { x: 100, y: 50 } }, // north
        edge2: { nodeId: "node3", pos: { x: 150, y: 50 } }, // north-east
        edge3: { nodeId: "node4", pos: { x: 50, y: 50 } }, // north-west
        edge4: { nodeId: "node5", pos: { x: 150, y: 100 } }, // east
        edge5: { nodeId: "node6", pos: { x: 50, y: 100 } }, // west
        edge6: { nodeId: "node7", pos: { x: 100, y: 150 } }, // south
        edge7: { nodeId: "node8", pos: { x: 150, y: 150 } }, // south-east
        edge8: { nodeId: "node9", pos: { x: 50, y: 150 } }, // south-west
      },
      () => undefined,
      "north"
    )
    it("should be north", () => {
      expect(direction).to.be.equal("north")
    })
  })
})

describe("handleNodeLabelAutoAdjustment with self-loop", () => {
  describe("avoid west widely", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node1", pos: { x: 100, y: 100 } }, // west (self-loop)
      },
      () => ({ x: 50, y: 100 }),
      "west"
    )
    it("should be east", () => {
      expect(direction).to.be.equal("east")
    })
  })

  describe("avoid east widely", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node1", pos: { x: 100, y: 100 } }, // east (self-loop)
      },
      () => ({ x: 150, y: 100 }),
      "east"
    )
    it("should be west", () => {
      expect(direction).to.be.equal("west")
    })
  })

  describe("avoid north widely", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node1", pos: { x: 100, y: 100 } }, // north (self-loop)
      },
      () => ({ x: 100, y: 50 }),
      "north"
    )
    it("should be south", () => {
      expect(direction).to.be.equal("south")
    })
  })

  describe("avoid south widely", () => {
    const direction = handleNodeLabelAutoAdjustment(
      "node1",
      { x: 100, y: 100 },
      {
        edge1: { nodeId: "node1", pos: { x: 100, y: 100 } }, // south (self-loop)
      },
      () => ({ x: 100, y: 150 }),
      "south"
    )
    it("should be north", () => {
      expect(direction).to.be.equal("north")
    })
  })
})

/**
 * Simple Array-based CRDT Sequence Node
 */
class CRDTNode {
  constructor(id, char, position) {
    this.id = id;             // Unique ID: e.g. "usr1_1.5"
    this.char = char;         // The character: 'A'
    this.position = position; // Fractional position number: 1.5
    this.deleted = false;     // Soft-delete marker (tombstone)
  }
}

class DocumentCRDT {
  constructor() {
    // Array of character nodes sorted by position
    this.nodes = [];
  }

  /**
   * Apply an insertion operation
   */
  insert(id, char, position) {
    // Check if node already exists (idempotency check)
    if (this.nodes.some((node) => node.id === id)) {
      return false;
    }

    const newNode = new CRDTNode(id, char, position);
    
    // Find insertion index maintaining sorted position order
    let insertIndex = this.nodes.findIndex((node) => node.position > position);
    
    if (insertIndex === -1) {
      this.nodes.push(newNode);
    } else {
      this.nodes.splice(insertIndex, 0, newNode);
    }

    return true;
  }

  /**
   * Apply a deletion operation using Tombstones
   */
  delete(id) {
    const node = this.nodes.find((n) => n.id === id);
    if (node && !node.deleted) {
      node.deleted = true; // Mark as tombstone
      return true;
    }
    return false;
  }

  /**
   * Convert CRDT sequence to plain text string
   */
  toString() {
    return this.nodes
      .filter((node) => !node.deleted)
      .map((node) => node.char)
      .join('');
  }

  /**
   * Helper to generate fractional positions between two positions
   */
  static generatePositionBetween(pos1 = 0, pos2 = 100) {
    return (pos1 + pos2) / 2;
  }
}

module.exports = { DocumentCRDT, CRDTNode };
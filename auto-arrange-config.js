/**
 * Adflow — Auto-Arrange Configuration Parameters
 * 
 * Edit the specs below to adjust how elements (Heading, Subheading, Button, Logo, Tagline, CRICOS)
 * are positioned and sized when the Auto-arrange layout action is run on different canvas sizes.
 */

const AUTO_ARRANGE_CONFIG = {
  // Configuration for 300x250 canvas size
  "300x250": {
    // Safezone boundaries
    safezone: {
      minX: 15,
      maxX: 288,
      minY: 13,
      maxY: 237,
    },

    // Heading placement parameters
    heading: {
      maxFontSize: 33,
    },

    // Subheading placement parameters
    subheading: {
      maxFontSize: 22,
      gapBelowHeading: 4, // vertical distance between Heading and Subheading boxes
    },

    // CTA Button placement parameters
    button: {
      width: 137,          // default width (1/2 safezone by default)
      gapBelowText: 8,     // vertical distance between subheading/heading box and button box
    },

    // Brand elements: Logo quadrant coordinates (TL: Top-Left, TR: Top-Right, BL: Bottom-Left, BR: Bottom-Right)
    logoCoords: {
      TL: { x: 15,  y: 14,  w: 95, h: 34 },
      TR: { x: 191, y: 14,  w: 95, h: 34 },
      BL: { x: 15,  y: 203, w: 95, h: 34 },
      BR: { x: 192, y: 203, w: 95, h: 34 }
    },

    // Brand elements: CRICOS quadrant coordinates and sizing
    cricos: {
      fontSize: 6,
      coords: {
        TL: { x: 13,  y: 7,   w: 86, h: 10 },
        TR: { x: 205, y: 7,   w: 86, h: 10 },
        BL: { x: 13,  y: 236, w: 86, h: 10 },
        BR: { x: 205, y: 236, w: 86, h: 10 }
      }
    },

    // Brand elements: RFWN Tagline quadrant coordinates and sizing
    tagline: {
      fontSize: 8,
      coords: {
        TL: { x: 14,  y: 12,  w: 50, h: 17 },
        TR: { x: 239, y: 12,  w: 50, h: 17 },
        BL: { x: 14,  y: 218, w: 50, h: 17 },
        BR: { x: 239, y: 218, w: 50, h: 17 }
      }
    }
  },

  // Configuration for 300x600 canvas size
  "300x600": {
    // Brand elements: Logo quadrant coordinates
    logoCoords: {
      TL: { x: 15,  y: 16,  w: 93, h: 33 },
      TR: { x: 191, y: 16,  w: 93, h: 33 },
      BL: { x: 15,  y: 551, w: 93, h: 33 },
      BR: { x: 191, y: 551, w: 93, h: 33 }
    },
    // Brand elements: RFWN Tagline quadrant coordinates and sizing
    tagline: {
      fontSize: 11,
      coords: {
        TL: { x: 17,  y: 16,  w: 75, h: 26 },
        TR: { x: 219, y: 16,  w: 75, h: 26 },
        BR: { x: 219, y: 560, w: 75, h: 26 },
        BL: { x: 17,  y: 560, w: 75, h: 26 }
      }
    }
  }
};

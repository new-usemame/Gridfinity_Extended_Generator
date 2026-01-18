# Gridfinity Generator

A fully configurable web-based Gridfinity generator for creating customizable storage bins and baseplates. Generate STL files for 3D printing directly in your browser.

![Gridfinity Generator](https://img.shields.io/badge/Gridfinity-Generator-22c55e?style=for-the-badge)
![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge)

## Features

### Box/Bin Configuration
- **Dimensions**: Width, depth, and height in grid units (0.5-8 units)
- **Wall Settings**: Customizable wall and floor thickness
- **Magnets**: Optional magnet holes with configurable diameter and depth
- **Screw Holes**: Optional screw mounting holes
- **Finger Slide**: Easy-access cutout on any side
- **Labels**: Tab for label placement
- **Dividers**: Internal compartment dividers (X and Y)
- **Lip Styles**: None, standard, or reduced stacking lip

### Baseplate Configuration
- **Dimensions**: Width and depth in grid units (1-10 units)
- **Styles**: Default, magnet holes, weighted (hollow), or screw holes
- **Lid Options**: None, flat lid, or half-pitch grid

### New Feature: Corner Rounding
- **Rounded Corners**: Add a corner radius (0-5mm) to make printing easier
- **Smoother Edges**: Reduces sharp corners that can cause printing issues
- **Configurable Segments**: Control the smoothness of rounded corners

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **3D Preview**: Three.js + react-three-fiber
- **Backend**: Node.js + Express
- **STL Generation**: OpenSCAD (CLI)
- **Deployment**: Railway / Docker

## Getting Started

### Prerequisites

- Node.js 18+
- OpenSCAD installed on your system
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gridfinity-generator/gridfinity-generator.git
cd gridfinity-generator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development servers:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

### Docker Deployment

Build and run with Docker:

```bash
docker build -t gridfinity-generator -f docker/Dockerfile .
docker run -p 3001:3001 gridfinity-generator
```

### Railway Deployment

1. Fork this repository
2. Connect your Railway account to GitHub
3. Create a new project from the repository
4. Railway will automatically detect the configuration and deploy

## API Endpoints

### Generate STL
```
POST /api/generate
Content-Type: application/json

{
  "type": "box" | "baseplate",
  "config": { ... }
}
```

### Download File
```
GET /api/files/:filename
```

### Health Check
```
GET /api/health
```

## Configuration Options

### Box Configuration
| Parameter | Type | Range | Default |
|-----------|------|-------|---------|
| width | number | 0.5-8 units | 1 |
| depth | number | 0.5-8 units | 1 |
| height | number | 1-10 units | 3 |
| wallThickness | number | 0.8-2.4 mm | 0.95 |
| floorThickness | number | 0.7-2.0 mm | 0.7 |
| magnetEnabled | boolean | - | true |
| magnetDiameter | number | 3-10 mm | 6 |
| magnetDepth | number | 1-5 mm | 2 |
| cornerRadius | number | 0-5 mm | 0 |

### Baseplate Configuration
| Parameter | Type | Range | Default |
|-----------|------|-------|---------|
| width | number | 1-10 units | 3 |
| depth | number | 1-10 units | 3 |
| style | string | default/magnet/weighted/screw | default |
| lidOption | string | none/flat/halfPitch | none |
| cornerRadius | number | 0-5 mm | 0 |
| cornerSegments | number | 8-64 | 32 |

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

Based on the excellent work of [gridfinity_extended_openscad](https://github.com/ostat/gridfinity_extended_openscad) by ostat.

## Acknowledgments

- [Gridfinity](https://www.youtube.com/watch?v=ra_9zU-mnl8) by Zack Freedman
- [gridfinity_extended_openscad](https://github.com/ostat/gridfinity_extended_openscad) by ostat
- [OpenSCAD](https://openscad.org/) for parametric 3D modeling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

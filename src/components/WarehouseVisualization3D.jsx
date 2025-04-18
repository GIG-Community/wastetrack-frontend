import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Box, Html, Line } from '@react-three/drei';
import { useState, useRef, useMemo } from 'react';
import * as THREE from 'three';

// Helper function to calculate optimal waste placement
const calculateOptimalPlacement = (wasteTypes, dimensions) => {
  // Minimal size values to ensure visibility
  const MIN_SIZE = 0.3;
  const MIN_SPACING = 0.2;
  
  // Calculate available space with margins
  const availableSpace = {
    length: dimensions.length * 0.9, // Leave 10% margin
    width: dimensions.width * 0.9,
    height: dimensions.height * 0.8 // Leave 20% margin at top
  };

  // Sort waste types by volume (largest first)
  const sortedWastes = Object.entries(wasteTypes)
    .map(([type, volume]) => ({ type, volume }))
    .sort((a, b) => b.volume - a.volume);

  const placements = [];
  let currentX = -dimensions.length / 2 + MIN_SPACING;
  let currentY = MIN_SPACING; // Start slightly above ground
  let currentZ = -dimensions.width / 2 + MIN_SPACING;
  let currentLayerHeight = 0;
  let currentRow = [];

  sortedWastes.forEach(({ type, volume }) => {
    // Calculate base dimensions ensuring minimum visibility
    const baseSize = Math.max(Math.cbrt(volume), MIN_SIZE);
    const height = Math.min(baseSize, availableSpace.height);
    const width = Math.min(Math.sqrt(volume / height), availableSpace.width / 4);
    const length = Math.min(volume / (height * width), availableSpace.length / 4);

    // Check if we need to start a new row
    if (currentX + length > dimensions.length / 2 - MIN_SPACING) {
      // Add spacing between rows based on max height in current row
      const maxRowHeight = Math.max(...currentRow.map(item => item.dimensions[1]));
      currentZ += MIN_SPACING + Math.max(...currentRow.map(item => item.dimensions[2]));
      currentX = -dimensions.length / 2 + MIN_SPACING;
      currentRow = [];
    }

    // Check if we need to start a new layer
    if (currentZ + width > dimensions.width / 2 - MIN_SPACING) {
      currentZ = -dimensions.width / 2 + MIN_SPACING;
      currentX = -dimensions.length / 2 + MIN_SPACING;
      currentY += currentLayerHeight + MIN_SPACING;
      currentLayerHeight = 0;
      currentRow = [];
    }

    // Create placement
    const placement = {
      type,
      position: [
        currentX + length/2,
        currentY + height/2,
        currentZ + width/2
      ],
      dimensions: [length, height, width],
      volume
    };

    placements.push(placement);
    currentRow.push(placement);
    
    // Update tracking variables
    currentLayerHeight = Math.max(currentLayerHeight, height);
    currentX += length + MIN_SPACING;
  });

  return placements;
};

// Component for individual waste containers
const WasteContainer = ({ data, dimensions, details, showDetails }) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();

  // Generate consistent color based on waste type
  const color = new THREE.Color().setHSL(
    Math.abs(data.type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360 / 360,
    0.6,
    0.5
  );

  return (
    <group position={data.position}>
      <Box
        ref={meshRef}
        args={dimensions}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshPhongMaterial
          color={color}
          transparent
          opacity={0.8}
          wireframe={hovered}
        />
      </Box>
      {(hovered || showDetails) && (
        <Html position={[0, dimensions[1] + 0.3, 0]} center>
          <div className="bg-white px-3 py-2 rounded-lg shadow-lg text-xs min-w-[150px] z-50">
            <p className="font-medium">
              {data.type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </p>
            <p className="text-zinc-600">Volume: {details.volume.toFixed(1)} m³</p>
            <p className="text-zinc-600">Berat: {details.weight.toFixed(1)} kg</p>
            <p className="text-zinc-500 text-[10px]">
              Sejak: {details.date.toLocaleDateString()}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
};

// Warehouse boundary visualization
const WarehouseBoundary = ({ dimensions }) => {
  const points = [
    [-dimensions.length/2, 0, -dimensions.width/2],
    [dimensions.length/2, 0, -dimensions.width/2],
    [dimensions.length/2, 0, dimensions.width/2],
    [-dimensions.length/2, 0, dimensions.width/2],
    [-dimensions.length/2, 0, -dimensions.width/2],
    [-dimensions.length/2, dimensions.height, -dimensions.width/2],
    [dimensions.length/2, dimensions.height, -dimensions.width/2],
    [dimensions.length/2, dimensions.height, dimensions.width/2],
    [-dimensions.length/2, dimensions.height, dimensions.width/2],
    [-dimensions.length/2, dimensions.height, -dimensions.width/2],
  ];

  return (
    <Line
      points={points}
      color="gray"
      lineWidth={1}
      dashed={true}
    />
  );
};

// Main scene component
const Scene = ({ wasteTypes, totalCapacity, currentStorage, dimensions, wasteDetails = {}, showAllDetails }) => {
  const optimalPlacements = useMemo(() => {
    // Ensure wasteTypes is not undefined and has data
    if (!wasteTypes || Object.keys(wasteTypes).length === 0) {
      return [];
    }
    return calculateOptimalPlacement(wasteTypes, dimensions);
  }, [wasteTypes, dimensions]);

  return (
    <group>
      {/* Base platform */}
      <Box
        args={[dimensions.length, 0.1, dimensions.width]}
        position={[0, -0.05, 0]}
      >
        <meshPhongMaterial color="#e5e7eb" />
      </Box>

      {/* Warehouse boundary */}
      <WarehouseBoundary dimensions={dimensions} />

      {/* Waste containers */}
      {optimalPlacements.map((placement, index) => {
        const wasteDetail = wasteDetails[placement.type] || [];
        const mostRecentEntry = wasteDetail.length > 0 ? 
          wasteDetail[wasteDetail.length - 1] : 
          { volume: 0, weight: 0, date: new Date() };

        return (
          <WasteContainer
            key={`${placement.type}-${index}`}
            data={placement}
            dimensions={placement.dimensions}
            details={{
              volume: placement.volume || 0,
              weight: (placement.volume || 0) / 0.2,
              date: mostRecentEntry.date
            }}
            showDetails={showAllDetails}
          />
        );
      })}
    </group>
  );
};

// Main component wrapper
const WarehouseVisualization3D = ({ 
  wasteTypes = {}, 
  totalCapacity = 0, 
  currentStorage = 0, 
  dimensions = { length: 10, width: 10, height: 2 },
  wasteDetails = {}
}) => {
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [isLegendVisible, setIsLegendVisible] = useState(true);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [15, 15, 15], fov: 50 }}
        className="bg-zinc-50"
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <spotLight 
          position={[-10, 15, -10]} 
          angle={0.3}
          penumbra={0.2}
          intensity={0.6}
          castShadow
        />
        
        <Scene
          wasteTypes={wasteTypes}
          totalCapacity={totalCapacity}
          currentStorage={currentStorage}
          dimensions={dimensions}
          wasteDetails={wasteDetails}
          showAllDetails={showAllDetails}
        />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
          minPolarAngle={Math.PI/6}
          maxPolarAngle={Math.PI/2}
        />
        
        <gridHelper args={[30, 30, '#ccc', '#eee']} />
      </Canvas>

      {/* Fixed Control Panel */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setShowAllDetails(!showAllDetails)}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-sm
            ${showAllDetails 
              ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
              : 'bg-white text-zinc-700 hover:bg-zinc-50'}`}
        >
          {showAllDetails ? 'Sembunyikan Detail' : 'Tampilkan Semua Detail'}
        </button>

        <button
          onClick={() => setIsLegendVisible(!isLegendVisible)}
          className="px-4 py-2 bg-white rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-all shadow-sm"
        >
          {isLegendVisible ? 'Sembunyikan Petunjuk' : 'Tampilkan Petunjuk'}
        </button>

        {/* Capacity indicator dengan warna yang sesuai berdasarkan persentase */}
        <div className={`px-3 py-2 rounded-lg shadow-sm text-xs font-medium ${
          (currentStorage / totalCapacity) * 100 >= 90 
            ? 'bg-red-500/95 text-white' 
            : (currentStorage / totalCapacity) * 100 >= 70
            ? 'bg-amber-500/95 text-slate-900'
            : 'bg-emerald-500/95 text-white'
        }`}>
          <p>Penggunaan: {((currentStorage / totalCapacity) * 100).toFixed(1)}%</p>
          <p>{currentStorage.toFixed(1)} / {totalCapacity} m³</p>
        </div>
      </div>

      {/* Collapsible Legend */}
      <div className={`absolute top-4 left-4 bg-white/90 px-4 py-3 rounded-lg shadow-sm text-xs 
        transition-all duration-300 ease-in-out ${isLegendVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'}`}>
        <div className="space-y-2">
          <div className="font-medium text-zinc-700 mb-2">Petunjuk Visualisasi:</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-zinc-200 rounded" />
            <span>Lantai dan grid menunjukkan skala (1 kotak = 1m)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-gray-400 rounded" />
            <span>Garis putus-putus menunjukkan batas gudang</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500/80 rounded" />
            <span>Blok berwarna menunjukkan tumpukan sampah</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <span>💡</span>
            <span>Arahkan kursor ke blok untuk melihat detail</span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-2 rounded-lg text-xs text-zinc-600 shadow-sm">
        🖱️ Klik dan Geser untuk merotasi
        <br />
        ⚲ Scroll untuk zoom
      </div>
    </div>
  );
};

export default WarehouseVisualization3D;
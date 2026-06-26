import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { COLORS, goalRow, goalCol, playerSide } from '../quoridor';
import * as THREE from 'three';

const CELL = 1.0;
const GUT = 0.18;
const UNIT = CELL + GUT;
const TILE_H = 0.16;
const TOP = TILE_H / 2;
const WALL_H = 1.6;

const LIMB = '#222a3f';

const cx = (c, half, unit) => c * unit - half + CELL / 2;
const cz = (r, half, unit) => r * unit - half + CELL / 2;

const WALK_DURATION = 0.55;
const WALK_STRIDE = 0.7;

function Character({ pawn, color, active, playerIndex, name, faceY, size, half, unit, winning }) {
  const ref = useRef();
  const lLeg = useRef();
  const rLeg = useRef();
  const lArm = useRef();
  const rArm = useRef();
  const torso = useRef();
  const ringRef = useRef();

  const w = useRef({
    fromX: cx(pawn.c, half, unit), fromZ: cz(pawn.r, half, unit),
    toX: cx(pawn.c, half, unit), toZ: cz(pawn.r, half, unit),
    elapsed: 999,
  });

  useFrame((st, delta) => {
    const g = ref.current;
    if (!g) return;

    const targetX = cx(pawn.c, half, unit);
    const targetZ = cz(pawn.r, half, unit);

    if (Math.hypot(targetX - w.current.toX, targetZ - w.current.toZ) > 0.001) {
      w.current.fromX = w.current.toX;
      w.current.fromZ = w.current.toZ;
      w.current.toX = targetX;
      w.current.toZ = targetZ;
      w.current.elapsed = 0;
    }

    const moving = w.current.elapsed < WALK_DURATION;
    const t = st.clock.elapsedTime;

    if (winning) {
      g.position.y = TOP + Math.sin(t * 5) * 0.1 + 0.08;
      g.rotation.y += Math.sin(t * 2) * 0.02;
      if (lArm.current) { lArm.current.rotation.x = -0.4 - Math.sin(t * 3) * 0.2; lArm.current.rotation.z = -1.4; }
      if (rArm.current) { rArm.current.rotation.x = -0.4 - Math.sin(t * 3 + 1) * 0.2; rArm.current.rotation.z = 1.4; }
      if (lLeg.current) lLeg.current.rotation.x = Math.sin(t * 5) * 0.08;
      if (rLeg.current) rLeg.current.rotation.x = -Math.sin(t * 5) * 0.08;
      if (torso.current) torso.current.rotation.y = Math.sin(t * 3) * 0.05;
    } else if (moving) {
      w.current.elapsed += delta;
      const p = Math.min(w.current.elapsed / WALK_DURATION, 1);
      const ease = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      g.position.x = w.current.fromX + (w.current.toX - w.current.fromX) * ease;
      g.position.z = w.current.fromZ + (w.current.toZ - w.current.fromZ) * ease;
      g.position.y = TOP + Math.sin(p * Math.PI) * 0.08;
      g.rotation.y = Math.atan2(w.current.toX - w.current.fromX, w.current.toZ - w.current.fromZ);

      const s = Math.sin(t * 22) * WALK_STRIDE;
      if (lLeg.current) lLeg.current.rotation.x = s;
      if (rLeg.current) rLeg.current.rotation.x = -s;
      if (lArm.current) { lArm.current.rotation.x = -s; lArm.current.rotation.z = 0; }
      if (rArm.current) { rArm.current.rotation.x = s; rArm.current.rotation.z = 0; }
      if (torso.current) { torso.current.rotation.y = 0; torso.current.position.y = Math.sin(p * Math.PI) * 0.04; }
    } else {
      g.position.x += (targetX - g.position.x) * 0.2;
      g.position.z += (targetZ - g.position.z) * 0.2;
      g.position.y = TOP + Math.sin(t * 2 + g.position.x) * 0.03;
      g.rotation.y += (faceY - g.rotation.y) * 0.15;
      if (lLeg.current) lLeg.current.rotation.x = 0;
      if (rLeg.current) rLeg.current.rotation.x = 0;
      if (lArm.current) { lArm.current.rotation.x = 0; lArm.current.rotation.z = 0.18; }
      if (rArm.current) { rArm.current.rotation.x = 0; rArm.current.rotation.z = -0.18; }
      if (torso.current) { torso.current.rotation.y = 0; torso.current.position.y = 0; }
    }
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 2.5) * 0.08;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  const emissive = active ? color : '#000000';
  const emissiveIntensity = active ? 0.5 : 0;
  const initX = cx(pawn.c, half, unit);
  const initZ = cz(pawn.r, half, unit);

  return (
    <group ref={ref} position={[initX, TOP, initZ]} rotation={[0, faceY, 0]}>
      {active && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry args={[0.34, 0.46, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.85} />
        </mesh>
      )}

      <group ref={torso}>
        <group ref={lLeg} position={[-0.12, 0.36, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.36, 12]} />
            <meshStandardMaterial color={LIMB} roughness={0.7} />
          </mesh>
        </group>
        <group ref={rLeg} position={[0.12, 0.36, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.36, 12]} />
            <meshStandardMaterial color={LIMB} roughness={0.7} />
          </mesh>
        </group>

        <mesh castShadow position={[0, 0.62, 0]}>
          <capsuleGeometry args={[0.2, 0.34, 6, 16]} />
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} emissive={emissive} emissiveIntensity={emissiveIntensity} />
        </mesh>

        <group ref={lArm} position={[-0.27, 0.80, 0]}>
          <mesh castShadow position={[0, -0.14, 0]}>
            <capsuleGeometry args={[0.06, 0.28, 4, 12]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        </group>
        <group ref={rArm} position={[0.27, 0.80, 0]}>
          <mesh castShadow position={[0, -0.14, 0]}>
            <capsuleGeometry args={[0.06, 0.28, 4, 12]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        </group>
      </group>

      <mesh castShadow position={[0, 1.02, 0]}>
        <sphereGeometry args={[0.21, 24, 24]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.2} emissive={emissive} emissiveIntensity={emissiveIntensity} />
      </mesh>

      <mesh position={[-0.08, 1.04, 0.18]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#0f1320" />
      </mesh>
      <mesh position={[0.08, 1.04, 0.18]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#0f1320" />
      </mesh>

      {name && (
        <Html position={[0, 1.35, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="board-nametag">{name}</div>
        </Html>
      )}
    </group>
  );
}

const hc = CELL / 2;

function Tri({ pts, color, onClick, onPointerOver, onPointerOut }) {
  const verts = [pts[0][0], 0, pts[0][1], pts[1][0], 0, pts[1][1], pts[2][0], 0, pts[2][1]];
  const up = [0, 1, 0, 0, 1, 0, 0, 1, 0];
  return (
    <mesh receiveShadow onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={3} array={new Float32Array(verts)} itemSize={3} />
        <bufferAttribute attach="attributes-normal" count={3} array={new Float32Array(up)} itemSize={3} />
      </bufferGeometry>
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

function MoveDot() {
  const ref = useRef();
  useFrame((st) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(st.clock.elapsedTime * 4) * 0.2;
    ref.current.scale.set(s, 1, s);
  });
  return (
    <mesh ref={ref} position={[0, TOP + 0.06, 0]}>
      <cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
      <meshStandardMaterial color="#9b59b6" emissive="#9b59b6" emissiveIntensity={0.9} transparent opacity={0.85} />
    </mesh>
  );
}

function Tile({ r, c, legal, half, unit, onClick, goalColor, cornerColors, diag, size }) {
  const base = (r + c) % 2 === 0 ? '#3a4467' : '#323b59';
  const color = legal ? '#9b59b6' : goalColor || base;
  const isCorner = (r === 0 || r === size - 1) && (c === 0 || c === size - 1);

  const ck = legal ? (e) => { e.stopPropagation(); onClick(r, c); } : undefined;
  const ov = legal ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined;
  const ou = legal ? () => (document.body.style.cursor = 'auto') : undefined;

  const shared = { onClick: ck, onPointerOver: ov, onPointerOut: ou };

  return (
    <group position={[cx(c, half, unit), 0, cz(r, half, unit)]}>
      {cornerColors ? diag === 'tl-br' ? (
        <>
          <Tri pts={[[-hc, -hc], [hc, -hc], [hc, hc]]} color={cornerColors[0]} {...shared} />
          <Tri pts={[[-hc, -hc], [hc, hc], [-hc, hc]]} color={cornerColors[1]} {...shared} />
        </>
      ) : (
        <>
          <Tri pts={[[-hc, -hc], [hc, -hc], [-hc, hc]]} color={cornerColors[0]} {...shared} />
          <Tri pts={[[hc, -hc], [hc, hc], [-hc, hc]]} color={cornerColors[1]} {...shared} />
        </>
      ) : (
        <mesh receiveShadow onClick={ck} onPointerOver={ov} onPointerOut={ou}>
          <boxGeometry args={[CELL, TILE_H, CELL]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      )}
      {legal && !isCorner && <MoveDot />}
    </group>
  );
}

function wallTransform(orientation, r, c, half, unit) {
  if (orientation === 'H') {
    const x = (cx(c, half, unit) + cx(c + 1, half, unit)) / 2;
    const z = cz(r, half, unit) + CELL / 2 + GUT / 2;
    return { pos: [x, TOP + WALL_H / 2, z], args: [CELL * 2 + GUT, WALL_H, GUT] };
  }
  const z = (cz(r, half, unit) + cz(r + 1, half, unit)) / 2;
  const x = cx(c, half, unit) + CELL / 2 + GUT / 2;
  return { pos: [x, TOP + WALL_H / 2, z], args: [GUT, WALL_H, CELL * 2 + GUT] };
}

function Wall({ orientation, r, c, preview, valid, half, unit }) {
  const ref = useRef();
  const coreRef = useRef();
  const { pos, args } = wallTransform(orientation, r, c, half, unit);

  const c1 = preview ? (valid ? '#36d399' : '#ff6b6b') : '#d7dfe1';
  const c2 = preview ? (valid ? '#36d399' : '#ff6b6b') : '#d8e3e5';

  useFrame((st) => {
    if (!preview && ref.current) {
      const p = Math.sin(st.clock.elapsedTime * 1.8) * 0.5 + 0.5;
      ref.current.material.emissiveIntensity = 0.8 + p * 0.5;
      ref.current.material.opacity = 0.8 + p * 0.25;
    }
    if (!preview && coreRef.current) {
      const p = Math.sin(st.clock.elapsedTime * 2.2 + 1) * 0.5 + 0.5;
      coreRef.current.material.opacity = 0.8 + p * 0.3;
    }
  });

  return (
    <group>
      <mesh ref={ref} position={pos} castShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial
          color={c1}
          roughness={0.15}
          metalness={0.1}
          transparent
          opacity={preview ? 0.72 : 0.7}
          emissive={c1}
          emissiveIntensity={preview ? (valid ? 0.3 : 0) : 0.5}
        />
      </mesh>
      <mesh ref={coreRef} position={pos}>
        <boxGeometry args={args.map((d, i) => i === 1 ? d * 0.5 : d * 0.85)} />
        <meshStandardMaterial
          color={c2}
          emissive={c2}
          emissiveIntensity={preview ? 0 : 0.8}
          transparent
          opacity={preview ? 0 : 0.55}
          roughness={0.1}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

function Hotspots({ onHover, onPlace, size, half, unit }) {
  const spots = [];
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const x = cx(c, half, unit) + CELL / 2 + GUT / 2;
      const z = cz(r, half, unit) + CELL / 2 + GUT / 2;
      spots.push(
        <mesh
          key={`hs-${r}-${c}`}
          position={[x, TOP + WALL_H / 2, z]}
          onPointerOver={(e) => { e.stopPropagation(); onHover({ r, c }); }}
          onClick={(e) => { e.stopPropagation(); onPlace(r, c); }}
        >
          <boxGeometry args={[UNIT, WALL_H, UNIT]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      );
    }
  }
  return <group>{spots}</group>;
}

function FollowControls({ pawn, half, unit }) {
  const ref = useRef();
  const { camera } = useThree();

  useEffect(() => {
    const ex = cx(pawn.c, half, unit);
    const ez = cz(pawn.r, half, unit);
    camera.position.set(ex - 4, TOP + 3.5, ez - 4);
    camera.lookAt(ex, TOP + 0.3, ez);
  }, []);

  useFrame(() => {
    if (ref.current) {
      ref.current.target.set(cx(pawn.c, half, unit), TOP + 0.3, cz(pawn.r, half, unit));
    }
  });

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan={false}
      enableDamping
      minDistance={2.5}
      maxDistance={18}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2.15}
    />
  );
}

const PARTICLE_COUNT = 80;

function Celebration({ pawn, color, half, unit }) {
  const [geo, setGeo] = useState(null);
  const pos = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const vel = useRef([]);
  const life = useRef(new Float32Array(PARTICLE_COUNT));
  const burst = useRef(0);

  const px = cx(pawn.c, half, unit);
  const pz = cz(pawn.r, half, unit);

  useFrame((st, delta) => {
    burst.current += delta;
    if (burst.current > 0.35) {
      burst.current = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.8;
        const spd = 0.6 + Math.random() * 1.2;
        vel.current[i] = [
          Math.sin(theta) * Math.cos(phi) * spd,
          1.2 + Math.random() * 2,
          Math.cos(theta) * Math.cos(phi) * spd,
        ];
        pos.current[i * 3] = px + (Math.random() - 0.5) * 0.2;
        pos.current[i * 3 + 1] = TOP + 0.3;
        pos.current[i * 3 + 2] = pz + (Math.random() - 0.5) * 0.2;
        life.current[i] = 1;
      }
    }
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (life.current[i] > 0) {
        vel.current[i][1] -= 3.5 * delta;
        pos.current[i * 3] += vel.current[i][0] * delta;
        pos.current[i * 3 + 1] += vel.current[i][1] * delta;
        pos.current[i * 3 + 2] += vel.current[i][2] * delta;
        life.current[i] -= delta * 0.8;
      }
    }
    if (geo) {
      geo.attributes.position.needsUpdate = true;
    }
  });

  useEffect(() => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos.current[i * 3] = px;
      pos.current[i * 3 + 1] = TOP;
      pos.current[i * 3 + 2] = pz;
      vel.current[i] = [0, 0, 0];
      life.current[i] = 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.current, 3));
    setGeo(g);
  }, []);

  if (!geo) return null;

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.12} color={color} transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

function SeatedFigure({ name }) {
  return (
    <group position={[0, 0.35, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.2, 4, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      {name && (
        <Html position={[0, 0.6, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="board-nametag">{name}</div>
        </Html>
      )}
    </group>
  );
}

function StadiumSeating({ size, half, spectatorNames }) {
  const parts = [];
  const seatW = 0.7;
  const seatD = 0.5;
  const seatH = 0.12;
  const rows = 5;
  const pitch = 0.8;
  const startDist = half + 3.5;
  const colors = ['#1e2740', '#232b45', '#28304a', '#2d3550', '#323b5a'];

  const sideConfigs = [
    { dx: 0, dz: -1, sx: size, rot: 0 },
    { dx: 0, dz: 1, sx: size, rot: Math.PI },
    { dx: 1, dz: 0, sx: size, rot: -Math.PI / 2 },
    { dx: -1, dz: 0, sx: size, rot: Math.PI / 2 },
  ];

  let key = 0;
  let figIdx = 0;
  const total = spectatorNames?.length || 0;
  for (const { dx, dz, sx, rot } of sideConfigs) {
    for (let row = 0; row < rows; row++) {
      const dist = startDist + row * pitch;
      const count = Math.floor((sx * 0.85) / seatW);
      const totalW = count * seatW;
      const startX = -totalW / 2 + seatW / 2;
      for (let i = 0; i < count; i++) {
        const offX = startX + i * seatW;
        const x = dx === 0 ? offX : dist * dx;
        const z = dz === 0 ? offX : dist * dz;
        const y = row * 0.35;
        const showFig = figIdx < total && row < 3 && (figIdx % 2 === 0 || i % 3 === 0);
        const name = showFig ? spectatorNames[figIdx] : null;
        if (showFig) figIdx++;
        parts.push(
          <group key={key++} position={[x, y, z]} rotation={[0, rot, 0]}>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[seatW * 0.9, seatH, seatD]} />
              <meshStandardMaterial color={colors[row % colors.length]} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.25, -0.15]} castShadow>
              <boxGeometry args={[seatW * 0.8, 0.35, seatD * 0.4]} />
              <meshStandardMaterial color="#1a2032" roughness={0.95} />
            </mesh>
            {name && <SeatedFigure name={name} />}
          </group>
        );
      }
    }
  }
  return <group>{parts}</group>;
}

export default function BoardScene({
  state,
  playerIndex,
  isSpectator,
  names,
  spectatorNames,
  mode,
  view,
  legalSet,
  onCellClick,
  onWallPlace,
  setHover,
  hover,
  orientation,
  wallValid,
}) {
  const wallMode = mode !== 'move';
  const firstPerson = view === 'fp';

  const { size = 9, playerCount = 2, pawns = [], walls = [], turn = 0, winner = null, disconnected = [] } = state || {};
  const span = size * CELL + (size - 1) * GUT;
  const half = span / 2;
  const unit = CELL + GUT;

  const boardPadding = 0.7;
  const shadowCam = size * 3;

  return (
    <>
      <color attach="background" args={['#0f1320']} />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[7, 14, 6]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-shadowCam}
        shadow-camera-right={shadowCam}
        shadow-camera-top={shadowCam}
        shadow-camera-bottom={-shadowCam}
      />
      <directionalLight position={[-6, 8, -8]} intensity={0.35} />

      <mesh position={[0, -0.33, 0]} receiveShadow castShadow>
        <boxGeometry args={[span + boardPadding, 0.5, span + boardPadding]} />
        <meshStandardMaterial color="#1c2336" roughness={0.7} metalness={0.15} />
      </mesh>

      <StadiumSeating size={size} half={half} spectatorNames={spectatorNames} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.59, 0]} receiveShadow>
        <planeGeometry args={[shadowCam * 2.5, shadowCam * 2.5]} />
        <meshStandardMaterial color="#0c0f19" roughness={1} />
      </mesh>

      {(() => {
        const tiles = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            let rowColor = null;
            let colColor = null;
            for (let i = 0; i < playerCount; i++) {
              const gr = goalRow(i, playerCount);
              const gc = goalCol(i, playerCount);
              const clr = COLORS[i % COLORS.length];
              if (gr !== undefined && r === gr) rowColor = clr;
              if (gc !== undefined && c === gc) colColor = clr;
            }
            let goalColor = null;
            let cornerColors = null;
            let diag = null;
            if (rowColor && colColor) {
              diag = r === c ? 'tl-br' : 'tr-bl';
              cornerColors = r === 0 ? [rowColor, colColor] : [colColor, rowColor];
            } else {
              goalColor = rowColor || colColor;
            }
            tiles.push(
              <Tile
                key={`t-${r}-${c}`}
                r={r}
                c={c}
                size={size}
                legal={legalSet.has(`${r},${c}`)}
                half={half}
                unit={unit}
                onClick={onCellClick}
                goalColor={goalColor}
                cornerColors={cornerColors}
                diag={diag}
              />
            );
          }
        }
        return tiles;
      })()}

      {walls.map((w, i) => (
        <Wall key={`w-${i}`} orientation={w.orientation} r={w.r} c={w.c} half={half} unit={unit} />
      ))}

      {wallMode && !firstPerson && hover && (
        <Wall orientation={orientation} r={hover.r} c={hover.c} preview valid={wallValid} half={half} unit={unit} />
      )}

      {wallMode && !firstPerson && <Hotspots onHover={setHover} onPlace={onWallPlace} size={size} half={half} unit={unit} />}

      {pawns.map((p, i) => {
        if (disconnected?.[i]) return null;
        const side = playerSide(i, playerCount);
        const faceY = side === 0 ? 0 : side === 1 ? -Math.PI / 2 : side === 2 ? Math.PI : Math.PI / 2;
        return (
          <Character
            key={`p-${i}`}
            pawn={p}
            color={COLORS[i % COLORS.length]}
            playerIndex={i}
            faceY={faceY}
            name={names?.[i] || `Player ${i + 1}`}
            active={turn === i && winner === null}
            winning={winner !== null && winner === i}
            size={size}
            half={half}
            unit={unit}
          />
        );
      })}

      {winner !== null && (
        <Celebration
          pawn={pawns[winner]}
          color={COLORS[winner % COLORS.length]}
          half={half}
          unit={unit}
        />
      )}

      {firstPerson && !isSpectator ? (
        <FollowControls pawn={pawns[playerIndex]} half={half} unit={unit} />
      ) : (
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          minDistance={size * 1.2}
          maxDistance={size * 5}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2.15}
          target={[0, 0, 0]}
        />
      )}
    </>
  );
}

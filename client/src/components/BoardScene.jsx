import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { COLORS, goalRow, goalCol, playerSide } from '../quoridor';

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

function Character({ pawn, color, active, playerIndex, name, faceY, size, half, unit }) {
  const ref = useRef();
  const lLeg = useRef();
  const rLeg = useRef();
  const lArm = useRef();
  const rArm = useRef();
  const torso = useRef();

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

    if (moving) {
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
  });

  const emissive = active ? color : '#000000';
  const emissiveIntensity = active ? 0.5 : 0;
  const initX = cx(pawn.c, half, unit);
  const initZ = cz(pawn.r, half, unit);

  return (
    <group ref={ref} position={[initX, TOP, initZ]} rotation={[0, faceY, 0]}>
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
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

function Tile({ r, c, legal, goalHighlight, goalColor, half, unit, onClick }) {
  const base = (r + c) % 2 === 0 ? '#3a4467' : '#323b59';
  const color = legal ? '#7184dd' : goalHighlight ? goalColor : base;
  const emissive = legal ? '#5566c4' : goalHighlight ? goalColor : '#000000';
  const emissiveIntensity = legal ? 0.7 : goalHighlight ? 0.35 : 0;

  return (
    <group position={[cx(c, half, unit), 0, cz(r, half, unit)]}>
      <mesh
        receiveShadow
        onClick={legal ? (e) => { e.stopPropagation(); onClick(r, c); } : undefined}
        onPointerOver={legal ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined}
        onPointerOut={legal ? () => (document.body.style.cursor = 'auto') : undefined}
      >
        <boxGeometry args={[CELL, TILE_H, CELL]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.85} />
      </mesh>
      {legal && (
        <mesh position={[0, TOP + 0.06, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 24]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
        </mesh>
      )}
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
  const { pos, args } = wallTransform(orientation, r, c, half, unit);
  const color = preview ? (valid ? '#36d399' : '#ff6b6b') : '#f6c453';
  return (
    <mesh position={pos} castShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0.1}
        transparent={preview}
        opacity={preview ? 0.72 : 1}
        emissive={preview && valid ? '#36d399' : '#000000'}
        emissiveIntensity={preview && valid ? 0.3 : 0}
      />
    </mesh>
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

export default function BoardScene({
  state,
  playerIndex,
  names,
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

  const { size = 9, playerCount = 2, pawns = [], walls = [], turn = 0, winner = null } = state || {};
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

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.59, 0]} receiveShadow>
        <planeGeometry args={[shadowCam * 2.5, shadowCam * 2.5]} />
        <meshStandardMaterial color="#0c0f19" roughness={1} />
      </mesh>

      {(() => {
        const tiles = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            let goalHighlight = false;
            let goalColor = '';
            for (let i = 0; i < playerCount; i++) {
              const gr = goalRow(i, playerCount);
              const gc = goalCol(i, playerCount);
              if ((gr !== undefined && r === gr) || (gc !== undefined && c === gc)) {
                goalHighlight = true;
                goalColor = COLORS[i % COLORS.length];
              }
            }
            tiles.push(
              <Tile
                key={`t-${r}-${c}`}
                r={r}
                c={c}
                legal={legalSet.has(`${r},${c}`)}
                goalHighlight={goalHighlight}
                goalColor={goalColor}
                half={half}
                unit={unit}
                onClick={onCellClick}
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
        const side = playerSide(i, playerCount);
        const faceY = side === 0 ? 0 : side === 1 ? Math.PI / 2 : side === 2 ? Math.PI : -Math.PI / 2;
        return (
          <Character
            key={`p-${i}`}
            pawn={p}
            color={COLORS[i % COLORS.length]}
            playerIndex={i}
            faceY={faceY}
            name={names?.[i] || `Player ${i + 1}`}
            active={turn === i && winner === null}
            size={size}
            half={half}
            unit={unit}
          />
        );
      })}

      {firstPerson ? (
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

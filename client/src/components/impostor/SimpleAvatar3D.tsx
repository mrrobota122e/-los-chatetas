import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';

interface SimpleAvatar3DProps {
    position?: [number, number, number];
    color?: string;
    highlighted?: boolean;
    scale?: number;
}

function AvatarMesh({ position = [0, 0, 0], color = '#00d9ff', highlighted = false, scale = 1 }: SimpleAvatar3DProps) {
    return (
        <group position={position} scale={scale}>
            {/* Head (sphere) */}
            <mesh position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={highlighted ? color : '#000000'}
                    emissiveIntensity={highlighted ? 0.5 : 0}
                />
            </mesh>

            {/* Body (capsule/cylinder) */}
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.25, 0.25, 0.8, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={highlighted ? color : '#000000'}
                    emissiveIntensity={highlighted ? 0.3 : 0}
                />
            </mesh>

            {/* Base (small cylinder for feet) */}
            <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.15, 0.2, 0.1, 32]} />
                <meshStandardMaterial color={color} />
            </mesh>

            {/* Glow effect when highlighted */}
            {highlighted && (
                <pointLight position={[0, 1, 0]} color={color} intensity={2} distance={3} />
            )}
        </group>
    );
}

export default function SimpleAvatar3D({ position, color, highlighted, scale }: SimpleAvatar3DProps) {
    return (
        <Canvas
            style={{ width: '100%', height: '100%' }}
            camera={{ position: [0, 2, 4], fov: 50 }}
        >
            <Suspense fallback={null}>
                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <spotLight position={[0, 5, 0]} angle={0.3} penumbra={1} intensity={1} castShadow />

                {/* Avatar */}
                <AvatarMesh position={position} color={color} highlighted={highlighted} scale={scale} />

                {/* Controls (disabled for fixed view) */}
                <OrbitControls enableZoom={false} enablePan={false} enableRotate={true} />
            </Suspense>
        </Canvas>
    );
}

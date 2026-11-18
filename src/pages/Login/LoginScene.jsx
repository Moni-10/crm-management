import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Animated 3D hero for the login screen:
// two clusters of meshed, glowing gears with orbiting data rings in opposite corners,
// a flowing particle "data wave" floor, drifting dust, and mouse parallax.

const CYAN = 0x00b4e6;
const MAGENTA = 0xe0287a;
const YELLOW = 0xf5bd0a;
const STEEL = 0x8fa3d1;

// Soft round sprite so points glow instead of rendering as squares.
function dotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function gearShape(teeth, outer, inner, hole) {
    const shape = new THREE.Shape();
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
        const a = i * step;
        const pts = [
            [inner, a],
            [outer, a + step * 0.12],
            [outer, a + step * 0.42],
            [inner, a + step * 0.54],
        ];
        pts.forEach(([r, ang], j) => {
            const x = Math.cos(ang) * r;
            const y = Math.sin(ang) * r;
            if (i === 0 && j === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        });
    }
    shape.closePath();
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, hole, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
    // Spoke cut-outs
    const spokes = 5;
    for (let s = 0; s < spokes; s++) {
        const a0 = (s / spokes) * Math.PI * 2 + 0.25;
        const a1 = a0 + (Math.PI * 2) / spokes - 0.5;
        const r0 = hole + (inner - hole) * 0.22;
        const r1 = inner * 0.78;
        const cut = new THREE.Path();
        cut.absarc(0, 0, r1, a0, a1, false);
        cut.absarc(0, 0, r0, a1, a0, true);
        cut.closePath();
        shape.holes.push(cut);
    }
    return shape;
}

const MODULE = 0.19; // radius per tooth, so neighbouring gears share a tooth pitch

function makeGear(teeth, color) {
    const radius = teeth * MODULE;
    const geometry = new THREE.ExtrudeGeometry(gearShape(teeth, radius, radius * 0.86, radius * 0.22), {
        depth: 0.55,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 2,
        curveSegments: 24,
    });
    geometry.center();
    const group = new THREE.Group();
    group.add(
        new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
                color: 0x1a2640, metalness: 0.85, roughness: 0.28,
                emissive: color, emissiveIntensity: 0.12, transparent: true, opacity: 0.92,
            }),
        ),
        new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry, 25),
            new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }),
        ),
    );
    group.userData.radius = radius;
    group.userData.teeth = teeth;
    return group;
}

export default function LoginScene() {
    const mountRef = useRef(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        } catch {
            return undefined; // No WebGL: the CSS gradient background still shows.
        }
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x070b16, 0.028);
        const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 200);
        camera.position.set(0, 1.5, 20);

        scene.add(new THREE.AmbientLight(0x8899cc, 0.5));
        const lights = [
            [CYAN, [-8, 6, 8]],
            [MAGENTA, [9, -4, 6]],
            [YELLOW, [2, 9, -4]],
        ].map(([color, pos]) => {
            const light = new THREE.PointLight(color, 90, 40, 1.6);
            light.position.set(...pos);
            scene.add(light);
            return light;
        });

        const sprite = dotTexture();

        // ---------- Gear clusters (one in the top-left corner, one in the bottom-right) ----------
        const rings = [];
        const nodes = [];
        const gears = [];
        const pitch = (g) => g.userData.radius * 0.93;
        const placeNext = (from, to, angle) => {
            const d = pitch(from) + pitch(to);
            to.position.set(from.position.x + Math.cos(angle) * d, from.position.y + Math.sin(angle) * d, 0);
        };
        const buildCluster = (colors, direction) => {
            const group = new THREE.Group();
            const big = makeGear(20, colors[0]);
            const mid = makeGear(12, colors[1]);
            const small = makeGear(9, colors[2]);
            const tiny = makeGear(8, STEEL);
            placeNext(big, mid, -0.45);
            placeNext(big, small, 2.2);
            placeNext(mid, tiny, 0.9);
            big.userData.speed = 0.35 * direction;
            big.userData.offset = 0;
            // Meshed gears turn the opposite way, faster by the tooth ratio.
            [[big, mid], [big, small], [mid, tiny]].forEach(([a, b]) => {
                b.userData.speed = -a.userData.speed * (a.userData.teeth / b.userData.teeth);
                b.userData.offset = Math.PI / b.userData.teeth;
            });
            [big, mid, small, tiny].forEach((g) => { group.add(g); gears.push(g); });

            // Orbit rings + travelling data nodes
            [
                { r: 5.8, tilt: [1.15, 0.2, 0], color: colors[0], speed: 0.35, count: 3 },
                { r: 6.8, tilt: [1.35, -0.45, 0.3], color: colors[1], speed: -0.25, count: 2 },
            ].forEach((def) => {
                const pivot = new THREE.Group();
                pivot.rotation.set(...def.tilt);
                pivot.add(new THREE.Mesh(
                    new THREE.TorusGeometry(def.r, 0.025, 8, 160),
                    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }),
                ));
                for (let i = 0; i < def.count; i++) {
                    const node = new THREE.Sprite(
                        new THREE.SpriteMaterial({ map: sprite, color: def.color, blending: THREE.AdditiveBlending, depthWrite: false }),
                    );
                    node.scale.setScalar(0.9);
                    node.userData = { r: def.r, speed: def.speed * direction, phase: (i / def.count) * Math.PI * 2 };
                    pivot.add(node);
                    nodes.push(node);
                }
                group.add(pivot);
                rings.push({ pivot, speed: def.speed * direction });
            });

            // Halo glow behind the cluster
            const halo = new THREE.Sprite(
                new THREE.SpriteMaterial({ map: sprite, color: colors[0], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
            );
            halo.scale.setScalar(20);
            halo.position.z = -3;
            group.add(halo);
            scene.add(group);
            return group;
        };
        const topCluster = buildCluster([CYAN, MAGENTA, YELLOW], 1);
        const bottomCluster = buildCluster([MAGENTA, YELLOW, CYAN], -1);
        const clusters = [topCluster, bottomCluster];

        // ---------- Data wave floor ----------
        const cols = 140;
        const rows = 60;
        const wavePos = new Float32Array(cols * rows * 3);
        const waveCol = new Float32Array(cols * rows * 3);
        const cA = new THREE.Color(CYAN);
        const cB = new THREE.Color(MAGENTA);
        const tmp = new THREE.Color();
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const k = (i * rows + j) * 3;
                wavePos[k] = (i / (cols - 1) - 0.5) * 70;
                wavePos[k + 1] = 0;
                wavePos[k + 2] = (j / (rows - 1)) * -40 + 10;
                tmp.copy(cA).lerp(cB, i / (cols - 1));
                waveCol.set([tmp.r, tmp.g, tmp.b], k);
            }
        }
        const waveGeo = new THREE.BufferGeometry();
        waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePos, 3));
        waveGeo.setAttribute('color', new THREE.BufferAttribute(waveCol, 3));
        const wave = new THREE.Points(
            waveGeo,
            new THREE.PointsMaterial({
                size: 0.3, map: sprite, vertexColors: true, transparent: true, opacity: 0.95,
                blending: THREE.AdditiveBlending, depthWrite: false,
            }),
        );
        wave.position.y = -8;
        scene.add(wave);

        // ---------- Floating dust ----------
        const dustCount = 700;
        const dustPos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
            dustPos[i * 3] = (Math.random() - 0.5) * 70;
            dustPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
            dustPos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 8;
        }
        const dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        const dust = new THREE.Points(
            dustGeo,
            new THREE.PointsMaterial({ size: 0.14, map: sprite, color: 0xbfd0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        scene.add(dust);

        // ---------- Layout: pin the clusters to the top-left and bottom-right corners ----------
        const CLUSTER_Z = -2;
        const layout = () => {
            const w = mount.clientWidth;
            const h = mount.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            // Half the visible height/width at the clusters' depth, so corners follow the screen shape.
            const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - CLUSTER_Z);
            const halfW = halfH * camera.aspect;
            const wide = w > 820;
            const scale = wide ? 0.6 : 0.42;
            // Centres sit a little inside the corner so the gears peek in and the rings spill off-screen.
            const inX = wide ? 0.86 : 0.75;
            topCluster.scale.setScalar(scale);
            bottomCluster.scale.setScalar(scale);
            topCluster.position.set(-halfW * inX, halfH * 0.78, CLUSTER_Z);
            bottomCluster.position.set(halfW * inX, -halfH * 0.68, CLUSTER_Z);
        };
        layout();

        const mouse = { x: 0, y: 0 };
        const onMove = (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('resize', layout);

        const clock = new THREE.Clock();
        let frame = 0;
        const render = () => {
            const t = clock.getElapsedTime();
            gears.forEach((g) => { g.rotation.z = g.userData.offset + t * g.userData.speed; });
            clusters.forEach((c, i) => {
                const s = i === 0 ? 1 : -1;
                c.rotation.y = s * (0.35 + Math.sin(t * 0.25) * 0.2) + mouse.x * 0.25;
                c.rotation.x = -0.15 + Math.sin(t * 0.2 + i) * 0.08 + mouse.y * 0.12;
            });
            rings.forEach(({ pivot, speed }) => { pivot.rotation.z += speed * 0.004; });
            nodes.forEach((n) => {
                const a = n.userData.phase + t * n.userData.speed * 1.6;
                n.position.set(Math.cos(a) * n.userData.r, Math.sin(a) * n.userData.r, 0);
            });

            const p = waveGeo.attributes.position.array;
            for (let k = 0; k < p.length; k += 3) {
                const x = p[k];
                const z = p[k + 2];
                p[k + 1] = Math.sin(x * 0.18 + t * 1.1) * 0.9 + Math.cos(z * 0.22 + t * 0.8) * 0.7
                    + Math.sin((x + z) * 0.08 + t * 0.5) * 0.6;
            }
            waveGeo.attributes.position.needsUpdate = true;

            dust.rotation.y = t * 0.015;
            dust.position.y = Math.sin(t * 0.3) * 0.5;
            lights[0].position.x = -8 + Math.sin(t * 0.6) * 3;
            lights[1].position.y = -4 + Math.cos(t * 0.5) * 3;

            camera.position.x += (mouse.x * 1.8 - camera.position.x) * 0.035;
            camera.position.y += (1.5 - mouse.y * 1.2 - camera.position.y) * 0.035;
            camera.lookAt(0, -0.5, 0);
            renderer.render(scene, camera);
        };
        const loop = () => {
            render();
            frame = requestAnimationFrame(loop);
        };
        const onVisibility = () => {
            cancelAnimationFrame(frame);
            if (!document.hidden && !reduceMotion) loop();
        };
        document.addEventListener('visibilitychange', onVisibility);
        if (reduceMotion) render();
        else loop();

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('resize', layout);
            document.removeEventListener('visibilitychange', onVisibility);
            scene.traverse((obj) => {
                obj.geometry?.dispose();
                obj.material?.dispose();
            });
            sprite.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return <div ref={mountRef} className="login-scene" aria-hidden="true" />;
}

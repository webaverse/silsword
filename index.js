import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useScene, useInternals, useLocalPlayer, useUse, useWear, usePhysics, useCleanup, useSound} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const localVector7 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localLine = new THREE.Line3();

const _makeSwordTransform = () => {
  return {
    swordPosition: new THREE.Vector3(),
    swordQuaternion: new THREE.Quaternion(),
    shoulderPosition: new THREE.Vector3(),
    shoulderQuaternion: new THREE.Quaternion(),
    copy(t) {
      this.swordPosition.copy(t.swordPosition);
      this.swordQuaternion.copy(t.swordQuaternion);
      this.shoulderPosition.copy(t.shoulderPosition);
      this.shoulderQuaternion.copy(t.shoulderQuaternion);
    },
  };
};
const tempSwordTransform = _makeSwordTransform();
const tempSwordTransform2 = _makeSwordTransform();

const startSwordTransform = _makeSwordTransform();
const lastSwordTransform = _makeSwordTransform();

export default e => {
  const app = useApp();
  window.silsword = app;
  const scene = useScene();
  const {sceneLowPriority} = useInternals();
  const physics = usePhysics();

  const sounds = useSound();
  const soundFiles = sounds.getSoundFiles();
  const soundIndex = soundFiles.combat.map(sound => sound.name).indexOf('combat/sword_slash0-1.wav');

  const {components} = app;

  const swordBackOffset = 0.5;
  const swordLength = 1.4;
  const normalScale = 0.05;
  const numSegments = 128;
  const planeGeometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1)
    // .applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), Math.PI*0.5))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0, -0.5, 0))
    .applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), -Math.PI * 0.5))
    .toNonIndexed();

  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(baseUrl + 'chevron2.svg');
  const textureR = textureLoader.load(baseUrl + 'textures/r.jpg');
  const textureG = textureLoader.load(baseUrl + 'textures/g.jpg');
  const textureB = textureLoader.load(baseUrl + 'textures/b.jpg');
  const wave2 = textureLoader.load(baseUrl + 'textures/wave2.jpeg');
  const wave20 = textureLoader.load(baseUrl + 'textures/wave20.png');
  const textureUvGrid = textureLoader.load(baseUrl + 'textures/uv_grid_opengl.jpg');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  const useComponent = components.find(component => component.key === 'use');
  const trail = useComponent?.value.trail;
  const a = new THREE.Vector3().fromArray(trail[0]);
  const b = new THREE.Vector3().fromArray(trail[1]);

  const lastPosition = new THREE.Vector3();

  const makeVerticleTrail = () => {
    const planeGeometry = new THREE.BufferGeometry();
    const planeNumber = 100;
    const position = new Float32Array(18 * planeNumber);
    planeGeometry.setAttribute('position', new THREE.BufferAttribute(position, 3));

    const uv = new Float32Array(12 * planeNumber);
    let fraction = 1;
    const ratio = 1 / planeNumber;
    for (let i = 0; i < planeNumber; i++) {
      uv[i * 12 + 0] = 0;
      uv[i * 12 + 1] = fraction;

      uv[i * 12 + 2] = 1;
      uv[i * 12 + 3] = fraction;

      uv[i * 12 + 4] = 0;
      uv[i * 12 + 5] = fraction - ratio;

      uv[i * 12 + 6] = 1;
      uv[i * 12 + 7] = fraction - ratio;

      uv[i * 12 + 8] = 0;
      uv[i * 12 + 9] = fraction - ratio;

      uv[i * 12 + 10] = 1;
      uv[i * 12 + 11] = fraction;

      fraction -= ratio;
    }
    planeGeometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
        },
        opacity: {
          value: 1,
        },
        textureR: {type: 't', value: textureR},
        textureG: {type: 't', value: textureG},
        textureB: {type: 't', value: textureB},
        textureUvGrid: {type: 't', value: textureUvGrid},
        t: {value: 0.9},
      },
      vertexShader: `\
        ${THREE.ShaderChunk.common}
        ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
        uniform float uTime;
        varying vec2 vUv;
        varying vec4 vUv4;
        
        void main() {
          vUv=uv;
          // vUv.y*=1.0;
          //vUv.x=1.-vUv.x;

          vUv4 = vec4(position, 1.0);

          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectionPosition = projectionMatrix * viewPosition;

          gl_Position = projectionPosition;
          ${THREE.ShaderChunk.logdepthbuf_vertex}
        }
      `,
      fragmentShader: `\
        ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
        uniform sampler2D textureR;
        uniform sampler2D textureG;
        uniform sampler2D textureB;
        uniform sampler2D textureUvGrid;
        uniform float uTime;
        uniform float opacity;
        varying vec2 vUv;
        varying vec4 vUv4;
        void main() {
          vec3 texColorR = texture2D(
            textureR,
            vec2(
              mod(1.*vUv.x+uTime*5.,1.),
              mod(2.*vUv.y+uTime*5.,1.)
            )
          ).rgb;
          vec3 texColorG = texture2D(
            textureG,
            vec2(
              mod(1.*vUv.x+uTime*5.,1.),
              mod(2.*vUv.y+uTime*5.,1.)
            )
          ).rgb;
          vec3 texColorB = texture2D(
            textureB,
            vec2(
              mod(1.*vUv.x,1.),
              mod(2.5*vUv.y+uTime*2.5,1.)
            )
          ).rgb;
          gl_FragColor = vec4(texColorB.b)*((vec4(texColorR.r)+vec4(texColorG.g))/2.);
          
          if( gl_FragColor.b >= 0.1 ){
            gl_FragColor = vec4(mix(vec3(0.020, 0.180, 1.920),vec3(0.284, 0.922, 0.980),gl_FragColor.b),gl_FragColor.b);
          }else{
            gl_FragColor = vec4(0.);
          }
          gl_FragColor *= vec4(sin(vUv.y) - 0.1);
          gl_FragColor *= vec4(smoothstep(0.3,0.628,vUv.y));
          if(abs(vUv.x)>0.9 || abs(vUv.x)<0.1)
            gl_FragColor.a=0.;
          
          gl_FragColor.a*=3.;
          gl_FragColor.a*=opacity;
            
          //gl_FragColor = vec4(vec3(texColor), texColor.b);
          //gl_FragColor.a*=(vUv.x)*5.;
          //gl_FragColor = vec4(vUv, 1.0, 1.0);
          // gl_FragColor = vec4(0,1,0,1);
          // gl_FragColor = vec4(vUv,0,1);
          // gl_FragColor = vec4(0,vUv.y,0,1);
          // gl_FragColor = texture2D(textureUvGrid, vUv);
          gl_FragColor = texture2DProj(textureUvGrid, vUv4);
          ${THREE.ShaderChunk.logdepthbuf_fragment}
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      // blending: THREE.AdditiveBlending,

      clipping: false,
      fog: false,
      lights: false,
    });
    material.freeze();

    const plane = new THREE.Mesh(planeGeometry, material);
    window.trailMesh = plane;
    plane.frustumCulled = false;
    sceneLowPriority.add(plane);

    const point1 = new THREE.Vector3();
    const point2 = new THREE.Vector3();
    const temp = [];
    const temp2 = [];

    let lastEnabled = false;

    useFrame(({timestamp}) => {
      if (!subApp) return;

      // const enabled = using;
      const matrixWorld = subApp.matrixWorld;

      const localPlayer = useLocalPlayer();
      if (!localPlayer.avatar) return;
      const useAction = localPlayer.getAction('use');

      const enabled = localPlayer.avatar.useTime > 0 && useAction.index < 4;

      // if (enabled) {
      //   material.uniforms.opacity.value = 1;
      // } else {
      //   if (material.uniforms.opacity.value > 0) { material.uniforms.opacity.value -= 0.0255; }
      // }

      if (enabled && !lastEnabled) { // reset vertices
        point1.copy(a).applyMatrix4(matrixWorld);
        point2.copy(b).applyMatrix4(matrixWorld);
        for (let i = 0; i < planeNumber; i++) {
          position[i * 18 + 0] = point1.x;
          position[i * 18 + 1] = point1.y;
          position[i * 18 + 2] = point1.z;

          position[i * 18 + 3] = point2.x;
          position[i * 18 + 4] = point2.y;
          position[i * 18 + 5] = point2.z;

          position[i * 18 + 6] = point1.x;
          position[i * 18 + 7] = point1.y;
          position[i * 18 + 8] = point1.z;

          
          position[i * 18 + 9] = point2.x;
          position[i * 18 + 10] = point2.y;
          position[i * 18 + 11] = point2.z;

          position[i * 18 + 12] = point1.x;
          position[i * 18 + 13] = point1.y;
          position[i * 18 + 14] = point1.z;

          position[i * 18 + 15] = point2.x;
          position[i * 18 + 16] = point2.y;
          position[i * 18 + 17] = point2.z;
        }

        planeGeometry.verticesNeedUpdate = true;
        planeGeometry.dynamic = true;
        planeGeometry.attributes.position.needsUpdate = true;
      }

      if (enabled) {
        point1.copy(a).applyMatrix4(matrixWorld);
        point2.copy(b).applyMatrix4(matrixWorld);

        for (let i = 0; i < 18; i++) {
          temp[i] = position[i];
        }
        for (let i = 0; i < planeNumber; i++) {
          if (i === 0) {
            position[0] = point1.x;
            position[1] = point1.y;
            position[2] = point1.z;

            position[3] = point2.x;
            position[4] = point2.y;
            position[5] = point2.z;

            position[6] = temp[0];
            position[7] = temp[1];
            position[8] = temp[2];


            position[9] = temp[3];
            position[10] = temp[4];
            position[11] = temp[5];

            position[12] = temp[0];
            position[13] = temp[1];
            position[14] = temp[2];

            position[15] = point2.x;
            position[16] = point2.y;
            position[17] = point2.z;
          } else {
            for (let j = 0; j < 18; j++) {
              temp2[j] = position[i * 18 + j];
              position[i * 18 + j] = temp[j];
              temp[j] = temp2[j];
            }
          }
        }

        planeGeometry.verticesNeedUpdate = true;
        planeGeometry.dynamic = true;
        planeGeometry.attributes.position.needsUpdate = true;
        material.uniforms.uTime.value = timestamp / 1000;
      }

      lastEnabled = enabled;
    });
  };
  makeVerticleTrail();

  let subApp = null;
  e.waitUntil((async () => {
    let u2 = baseUrl + 'megasword_v4_texta.glb';
    if (/^https?:/.test(u2)) {
      u2 = '/@proxy/' + u2;
    }
    const m = await metaversefile.import(u2);

    subApp = metaversefile.createApp({
      name: u2,
    });
    window.subApp = subApp;
    subApp.name = 'silsword mesh';
    app.add(subApp);
    subApp.updateMatrixWorld();
    subApp.contentId = u2;
    subApp.instanceId = app.instanceId;

    for (const {key, value} of components) {
      subApp.setComponent(key, value);
    }
    await subApp.addModule(m);
  })());

  let wearing = false;
  useWear(e => {
    const {wear} = e;
    if (subApp) {
    }
    wearing = !!wear;
  });

  let using = false;
  useUse(e => {
    using = e.use;
  });

  const animationOffset = {
    swordSideSlash: 350,
    swordSideSlashStep: 150,
    swordTopDownSlash: 100,
    swordTopDownSlashStep: 150,
  };
  let startAnimationTime = 0;
  let playSoundSw = false;
  let lastPlaySoundAnimationIndex = null;
  useFrame(() => {
    const localPlayer = useLocalPlayer();
    if (localPlayer.avatar && wearing) {
      if (localPlayer.avatar.useAnimationIndex >= 0 && localPlayer.avatar.useAnimationIndex !== lastPlaySoundAnimationIndex) {
        if (startAnimationTime === 0) {
          startAnimationTime = performance.now();
        }
        if (
          performance.now() - startAnimationTime >= animationOffset[localPlayer.avatar.useAnimationCombo[localPlayer.avatar.useAnimationIndex]] &&
          !playSoundSw
        ) {
          const indexOfSlash = localPlayer.avatar.useAnimationIndex;
          sounds.playSound(soundFiles.combat[soundIndex + (4 * indexOfSlash + Math.floor(Math.random() * 4))]);
          localPlayer.characterSfx.playGrunt('attack');
          playSoundSw = true;
          lastPlaySoundAnimationIndex = localPlayer.avatar.useAnimationIndex;
        }
      } else {
        playSoundSw = false;
        startAnimationTime = 0;
      }
      if (!(localPlayer.avatar.useAnimationIndex >= 0)) lastPlaySoundAnimationIndex = null;
    }
  });

  useCleanup(() => {
    subApp && subApp.destroy();
  });

  app.getPhysicsObjects = () => subApp ? subApp.getPhysicsObjects() : [];

  return app;
};

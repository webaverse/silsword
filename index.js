import * as THREE from 'three';
// import Simplex from './simplex-noise.js';
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
  const maxNumDecals = 128;
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
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const decalMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    map: texture,
    side: THREE.DoubleSide,
    // transparent: true,
  });
  // decalMaterial.freeze();

  // test the decal texture
  // const m = new THREE.Mesh(planeGeometry, decalMaterial);
  // scene.add(m);

  /* const boxGeometry = new THREE.BoxBufferGeometry(0.1, 0.1, 0.1);
  const currentTransformMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color: 0xff0000}));
  scene.add(currentTransformMesh);
  const backTransformMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color: 0x0000ff}));
  scene.add(backTransformMesh); */

  const _makeDecalMesh = () => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(planeGeometry.attributes.position.array.length * numSegments * maxNumDecals);
    const positionsAttribute = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', positionsAttribute);
    const normals = new Float32Array(planeGeometry.attributes.normal.array.length * numSegments * maxNumDecals);
    const normalsAttribute = new THREE.BufferAttribute(normals, 3);
    geometry.setAttribute('normal', normalsAttribute);
    const uvs = new Float32Array(planeGeometry.attributes.uv.array.length * numSegments * maxNumDecals);
    const uvsAttribute = new THREE.BufferAttribute(uvs, 2);
    geometry.setAttribute('uv', uvsAttribute);
    // const indices = new Uint16Array(planeGeometry.index.array.length * maxNumDecals);
    // const indicesAttribute = new THREE.BufferAttribute(indices, 1);
    // geometry.setIndex(indicesAttribute);

    const decalMesh = new THREE.Mesh(geometry, decalMaterial);
    decalMesh.name = 'DecalMesh';
    decalMesh.frustumCulled = false;
    decalMesh.offset = 0;
    let lastHitPoint = null;
    const thickness = 0.05;
    decalMesh.update = (using, matrixWorldSword, matrixWorldShoulder) => {
      const _getCurrentSwordTransform = swordTransform => {
        matrixWorldSword.decompose(localVector, localQuaternion, localVector2);
        localQuaternion.multiply(
          localQuaternion2.setFromAxisAngle(localVector2.set(1, 0, 0), Math.PI * 0.5),
        );
        swordTransform.swordPosition.copy(localVector);
        swordTransform.swordQuaternion.copy(localQuaternion);

        matrixWorldShoulder.decompose(swordTransform.shoulderPosition, swordTransform.shoulderQuaternion, localVector2);

        return swordTransform;
      };
      const endSwordTransform = _getCurrentSwordTransform(tempSwordTransform);

      /* // debug meshes
      {
        currentTransformMesh.position.copy(
          endSwordTransform.swordPosition
        ).add(
          new THREE.Vector3(0, 0, -swordLength)
            .applyQuaternion(endSwordTransform.swordQuaternion)
        );
        currentTransformMesh.quaternion.copy(endSwordTransform.swordQuaternion);
        currentTransformMesh.updateMatrixWorld();

        backTransformMesh.position.copy(endSwordTransform.shoulderPosition);
        backTransformMesh.quaternion.copy(endSwordTransform.shoulderQuaternion);
        backTransformMesh.updateMatrixWorld();
      } */

      if (!using) {
        startSwordTransform.copy(endSwordTransform);
        lastSwordTransform.copy(endSwordTransform);
        lastHitPoint = null;
        return;
      }

      const _lerpSwordTransform = (a, b, swordTransform, f) => {
        swordTransform.shoulderPosition.copy(a.shoulderPosition).lerp(b.shoulderPosition, f);
        swordTransform.shoulderQuaternion.copy(a.shoulderQuaternion).slerp(b.shoulderQuaternion, f);
        swordTransform.swordPosition.copy(a.swordPosition).lerp(b.swordPosition, f);
        swordTransform.swordQuaternion.copy(a.swordQuaternion).slerp(b.swordQuaternion, f);
        return swordTransform;
      };
      // XXX this should have destination sword transform as an argument, to prevent allocations
      const _getNextPoint = currentSwordTransform => {
        const line = localLine.set(
          currentSwordTransform.shoulderPosition,
          currentSwordTransform.swordPosition.clone()
            .add(localVector.set(0, 0, -swordLength).applyQuaternion(currentSwordTransform.swordQuaternion)),
        );
        const lineQuaternion = localQuaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            line.start,
            line.end,
            localVector.set(0, 1, 0),
          ),
        );
        const result = physics.raycast(line.start, lineQuaternion);

        if (result) {
          const hitPoint = localVector.fromArray(result.point);
          if (hitPoint.distanceTo(line.start) <= line.distance()) {
            /* // debug meshes
            // {
              const boxGeometry3 = new THREE.BoxBufferGeometry(0.01, 0.01, 0.01);
              const hitMesh = new THREE.Mesh(boxGeometry3, new THREE.MeshBasicMaterial({color: i === 0 ? 0x00FF00 : 0x808080}));
              hitMesh.position.copy(hitPoint);
              hitMesh.updateMatrixWorld();
              scene.add(hitMesh);
            // } */

            // if consecutive hits are too far apart, treat them as separate hits
            if (lastHitPoint && hitPoint.distanceTo(lastHitPoint.hitPoint) > 0.2) {
              lastHitPoint = null;
            }

            const normal = localVector2.copy(line.start)
              .sub(line.end)
              .normalize();
            const hitNormal = localVector3.fromArray(result.normal);

            const normalScaled = localVector4.copy(normal).multiplyScalar(normalScale);
            const normalBack = localVector5.copy(normal).multiplyScalar(swordBackOffset);
            const hitNormalBack = localVector6.copy(hitNormal).multiplyScalar(swordBackOffset);

            const normalUpQuaternion = localQuaternion2.setFromUnitVectors(
              localVector7.set(0, 0, -1),
              normal,
            );
            const normalDownQuaternion = localQuaternion3.setFromUnitVectors(
              localVector7.set(0, 0, 1),
              normal,
            );

            let rotationMatrix;
            let localWidth;
            let initialHit;
            if (lastHitPoint) {
              rotationMatrix = localMatrix.lookAt(
                lastHitPoint.hitPoint,
                hitPoint,
                hitNormal,
              );
              localWidth = lastHitPoint.hitPoint.distanceTo(hitPoint);
              initialHit = false;
            } else {
              rotationMatrix = null;
              localWidth = 0;
              initialHit = true;
            }

            return {
              initialHit,
              hitPoint: hitPoint.clone(),
              rotationMatrix: rotationMatrix && rotationMatrix.clone(),
              normal: normal.clone(),
              normalBack: normalBack.clone(),
              normalScaled: normalScaled.clone(),
              hitNormalBack: hitNormalBack.clone(),
              normalUpQuaternion: normalUpQuaternion.clone(),
              normalDownQuaternion: normalDownQuaternion.clone(),
              width: localWidth,
              thickness,
              forwardLeftPoint: new THREE.Vector3(),
              forwardRightPoint: new THREE.Vector3(),
            };
          } else {
            return null;
          }
        } else {
          return null;
        }
      };
      const localDecalGeometries = [];
      let uvOffset = 0;
      const _drawPoints = () => {
        for (let i = 1; i < numSegments; i++) {
          const f = i / (numSegments - 1);

          const currentSwordTransform = _lerpSwordTransform(startSwordTransform, endSwordTransform, tempSwordTransform2, f);
          /* if (using) {
            const hitMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color: i === 0 ? 0x00FF00 : 0x808080}));
            hitMesh.position.copy(currentSwordTransform.position)
              .add(new THREE.Vector3(0, 0, -swordLength).applyQuaternion(currentSwordTransform.quaternion));
            hitMesh.quaternion.copy(currentSwordTransform.quaternion);
            hitMesh.updateMatrixWorld();
            scene.add(hitMesh);

            const box2Geometry = new THREE.BoxBufferGeometry(0.005, 0.005, 1)
              .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -0.5))
              .applyMatrix4(new THREE.Matrix4().makeScale(1, 1, swordBackOffset + swordLength));

            const hitMesh2 = new THREE.Mesh(
              box2Geometry,
              new THREE.MeshBasicMaterial({color: 0x00FF00})
            );
            hitMesh2.position.copy(currentSwordTransform.position)
              .add(new THREE.Vector3(0, 0, swordBackOffset).applyQuaternion(currentSwordTransform.quaternion));
            hitMesh2.quaternion.copy(currentSwordTransform.quaternion);
            hitMesh2.updateMatrixWorld();
            scene.add(hitMesh2);
          } */

          const nextPoint = _getNextPoint(currentSwordTransform);
          if (nextPoint && !nextPoint.initialHit) {
            const {hitPoint, rotationMatrix, normalBack, normalScaled, normalDownQuaternion, width, thickness} = nextPoint;

            const localDecalGeometry = planeGeometry.clone();

            localDecalGeometry
              .applyMatrix4(localMatrix.makeScale(thickness, 1, width))
              .applyMatrix4(rotationMatrix)
              .applyMatrix4(new THREE.Matrix4().makeTranslation(
                hitPoint.x,
                hitPoint.y,
                hitPoint.z,
              ));

            const uvs = localDecalGeometry.attributes.uv.array;
            for (let j = 0; j < localDecalGeometry.attributes.uv.count; j++) {
              const index = j * 2;
              const yIndex = index + 1;
              uvs[yIndex] = (uvOffset + uvs[yIndex] * width) * 4; // y
            }
            uvOffset += width;

            // if there was a previous point, copy the last point's forward points to the next point's backward points
            if (lastHitPoint && !lastHitPoint.initialHit) {
              for (let j = 0; j < localDecalGeometry.attributes.position.count; j++) {
                localVector.fromArray(planeGeometry.attributes.position.array, j * 3);
                if (localVector.z >= 1) { // if this is a backward point
                  const isLeft = localVector.x < 0;
                  (isLeft ? lastHitPoint.forwardLeftPoint : lastHitPoint.forwardRightPoint)
                    .toArray(localDecalGeometry.attributes.position.array, j * 3);
                }
              }
            }

            // make the local decal geometry conform to the object mesh by raycasting from the decal mesh points down the normal
            for (let j = 0; j < localDecalGeometry.attributes.position.count; j++) {
              // localVector.fromArray(planeGeometry.attributes.position.array, j*3);
              if (
                localVector.z < 1 || // if this is a forward point
                lastHitPoint.initialHit // if this is the beginning of a chain
              ) {
                localVector.fromArray(localDecalGeometry.attributes.position.array, j * 3);
                localVector2.copy(localVector)
                  .add(normalBack);
                const result = physics.raycast(localVector2, normalDownQuaternion);
                if (result) {
                  localVector3.fromArray(result.point);
                  if (localVector.distanceTo(localVector3) < 0.1) {
                    localVector3
                      .add(normalScaled)
                      .toArray(localDecalGeometry.attributes.position.array, j * 3);
                  } else {
                    localVector.add(
                      localVector2.copy(localVector3)
                        .sub(localVector)
                        .normalize()
                        .multiplyScalar(0.1),
                    ).toArray(localDecalGeometry.attributes.position.array, j * 3);
                  }
                }
              }
            }

            nextPoint.forwardLeftPoint.fromArray(localDecalGeometry.attributes.position.array, 0 * 3);
            nextPoint.forwardRightPoint.fromArray(localDecalGeometry.attributes.position.array, 2 * 3);
            localDecalGeometries.push(localDecalGeometry);
          }

          lastSwordTransform.copy(currentSwordTransform);
          lastHitPoint = nextPoint;
        }
      };
      _drawPoints();
      decalMesh.mergeGeometries(localDecalGeometries);
      startSwordTransform.copy(endSwordTransform);
      lastSwordTransform.copy(endSwordTransform);
    };
    const updateRanges = [];
    decalMesh.mergeGeometries = localDecalGeometies => {
      if (localDecalGeometies.length > 0) {
        const _makeUpdateRange = () => ({
          position: {
            offset: decalMesh.offset * 3,
            count: 0,
          },
          uv: {
            offset: decalMesh.offset * 2,
            count: 0,
          },
          normal: {
            offset: decalMesh.offset * 3,
            count: 0,
          },
        });
        const lastUpdateRange = updateRanges.length > 0 ? updateRanges[updateRanges.length - 1] : null;
        let updateRange = (
          lastUpdateRange &&
            ((lastUpdateRange.position.offset + lastUpdateRange.position.count) < decalMesh.geometry.attributes.position.count * 3)
        )
          ? lastUpdateRange
          : null;
        for (const localDecalGeometry of localDecalGeometies) {
          const startOffset = decalMesh.offset;

          for (let i = 0; i < localDecalGeometry.attributes.position.count; i++) {
            decalMesh.geometry.attributes.position.setXYZ(i + startOffset, localDecalGeometry.attributes.position.getX(i), localDecalGeometry.attributes.position.getY(i), localDecalGeometry.attributes.position.getZ(i));
            decalMesh.geometry.attributes.uv.setXY(i + startOffset, localDecalGeometry.attributes.uv.getX(i), localDecalGeometry.attributes.uv.getY(i));
            decalMesh.geometry.attributes.normal.setXYZ(i + startOffset, localDecalGeometry.attributes.normal.getX(i), localDecalGeometry.attributes.normal.getY(i), localDecalGeometry.attributes.normal.getZ(i));
            // decalMesh.geometry.index.setX( i + offset, localDecalGeometry.index.getX(i) );
          }

          // flag geometry attributes for update
          if (!updateRange) {
            updateRange = _makeUpdateRange();
            updateRanges.push(updateRange);
          }
          updateRange.position.count += localDecalGeometry.attributes.position.count * 3;
          updateRange.uv.count += localDecalGeometry.attributes.uv.count * 2;
          updateRange.normal.count += localDecalGeometry.attributes.normal.count * 3;

          // update geometry attribute offset
          decalMesh.offset += localDecalGeometry.attributes.position.count;
          if (decalMesh.offset >= decalMesh.geometry.attributes.position.count) {
            decalMesh.offset = decalMesh.offset % decalMesh.geometry.attributes.position.count;
            updateRange = null;
          }
        }
      }
    };
    decalMesh.pushGeometryUpdate = () => {
      const updateRange = updateRanges.shift();
      if (updateRange) {
        decalMesh.geometry.attributes.position.updateRange = updateRange.position;
        decalMesh.geometry.attributes.position.needsUpdate = true;
        decalMesh.geometry.attributes.uv.updateRange = updateRange.uv;
        decalMesh.geometry.attributes.uv.needsUpdate = true;
        decalMesh.geometry.attributes.normal.updateRange = updateRange.normal;
        decalMesh.geometry.attributes.normal.needsUpdate = true;
      }
    };

    return decalMesh;
  };
  const decalMesh = _makeDecalMesh();
  scene.add(decalMesh);

  //

  const trailDirObj = new THREE.Object3D();
  window.trailDirObj = trailDirObj;

  const preprocessTrails = () => {
    const useComponent = components.find(component => component.key === 'use');
    const trail = useComponent?.value.trail;
    const a = new THREE.Vector3().fromArray(trail[0]);
    const b = new THREE.Vector3().fromArray(trail[1]);

    const lastPosition = new THREE.Vector3();
    useFrame(({timestamp}) => {
      if (!subApp) return;

      trailDirObj.position.copy(b).applyMatrix4(subApp.matrixWorld);
      if (!trailDirObj.position.equals(lastPosition)) {
        trailDirObj.lookAt(lastPosition);
      }
      trailDirObj.updateMatrixWorld();

      lastPosition.copy(trailDirObj.position);
    });
  };
  preprocessTrails();

  const makeHorizontalTrail = () => {
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
          value: 0,
        },
        textureR: {type: 't', value: textureR},
        textureG: {type: 't', value: textureG},
        textureB: {type: 't', value: textureB},
        t: {value: 0.9},
      },
      vertexShader: `\
        ${THREE.ShaderChunk.common}
        ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
        uniform float uTime;
        varying vec2 vUv;
        
        void main() {
          vUv=uv;
          vUv.y*=1.0;
          //vUv.x=1.-vUv.x;
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
        uniform float uTime;
        uniform float opacity;
        varying vec2 vUv;
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
          // gl_FragColor = vec4(1,0,0,1);
          ${THREE.ShaderChunk.logdepthbuf_fragment}
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,

      clipping: false,
      fog: false,
      lights: false,
    });
    material.freeze();

    const plane = new THREE.Mesh(planeGeometry, material);
    plane.frustumCulled = false;
    sceneLowPriority.add(plane);

    const point1 = new THREE.Vector3();
    const point2 = new THREE.Vector3();
    const temp = [];
    const temp2 = [];

    useFrame(({timestamp}) => {
      if (!subApp) return;

      // const enabled = using;
      const matrixWorld = trailDirObj.matrixWorld;

      const localPlayer = useLocalPlayer();
      const useAction = localPlayer.getAction('use');

      if (localPlayer.avatar.useTime > 0 && useAction.index < 4) {
        material.uniforms.opacity.value = 1;
      } else {
        if (material.uniforms.opacity.value > 0) { material.uniforms.opacity.value -= 0.0255; }
      }

      if (material.uniforms.opacity.value > 0) {
        localQuaternion.setFromRotationMatrix(matrixWorld);
        localVector2.set(0.3, 0, 0).applyQuaternion(localQuaternion);
        localVector.set(0, 0, 0).applyMatrix4(matrixWorld);

        point1.x = localVector.x;
        point1.y = localVector.y;
        point1.z = localVector.z;
        point2.x = localVector.x;
        point2.y = localVector.y;
        point2.z = localVector.z;

        point1.x -= localVector2.x;
        point1.y -= localVector2.y;
        point1.z -= localVector2.z;
        point2.x += localVector2.x;
        point2.y += localVector2.y;
        point2.z += localVector2.z;

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
    });
  };
  makeHorizontalTrail();

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
          value: 0,
        },
        textureR: {type: 't', value: textureR},
        textureG: {type: 't', value: textureG},
        textureB: {type: 't', value: textureB},
        t: {value: 0.9},
      },
      vertexShader: `\
        ${THREE.ShaderChunk.common}
        ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
        uniform float uTime;
        varying vec2 vUv;
        
        void main() {
          vUv=uv;
          vUv.y*=1.0;
          //vUv.x=1.-vUv.x;
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
        uniform float uTime;
        uniform float opacity;
        varying vec2 vUv;
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
          ${THREE.ShaderChunk.logdepthbuf_fragment}
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,

      clipping: false,
      fog: false,
      lights: false,
    });
    material.freeze();

    const plane = new THREE.Mesh(planeGeometry, material);
    plane.frustumCulled = false;
    sceneLowPriority.add(plane);

    const point1 = new THREE.Vector3();
    const point2 = new THREE.Vector3();
    const temp = [];
    const temp2 = [];

    useFrame(({timestamp}) => {
      if (!subApp) return;

      // const enabled = using;
      const matrixWorld = trailDirObj.matrixWorld;

      const localPlayer = useLocalPlayer();
      const useAction = localPlayer.getAction('use');

      if (localPlayer.avatar.useTime > 0 && useAction.index < 4) {
        material.uniforms.opacity.value = 1;
      } else {
        if (material.uniforms.opacity.value > 0) { material.uniforms.opacity.value -= 0.0255; }
      }

      if (material.uniforms.opacity.value > 0) {
        localQuaternion.setFromRotationMatrix(matrixWorld);
        localVector2.set(0, 0.3, 0).applyQuaternion(localQuaternion);
        localVector.set(0, 0, 0).applyMatrix4(matrixWorld);

        point1.x = localVector.x;
        point1.y = localVector.y;
        point1.z = localVector.z;
        point2.x = localVector.x;
        point2.y = localVector.y;
        point2.z = localVector.z;

        point1.x -= localVector2.x;
        point1.y -= localVector2.y;
        point1.z -= localVector2.z;
        point2.x += localVector2.x;
        point2.y += localVector2.y;
        point2.z += localVector2.z;

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
    });
  };
  makeVerticleTrail();

  const makeFrontWave = () => {
    const geometry = new THREE.SphereBufferGeometry(1.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.4);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          type: 'f',
          value: 0.0,
        },
        color: {
          value: new THREE.Vector3(0.400, 0.723, 0.910),
        },
        strength: {
          value: 0.01,
        },
        perlinnoise: {
          type: 't',
          value: wave2,
        },

      },
      vertexShader: `\
          
        ${THREE.ShaderChunk.common}
        ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
        
      
        varying vec2 vUv;

        void main() {
            vUv = uv;
            vec3 pos = vec3(position.x,position.y,position.z);
            if(pos.y >= 1.87){
                pos = vec3(position.x*(sin((position.y - 0.6)*1.27)-0.16),position.y,position.z*(sin((position.y - 0.6)*1.27)-0.16));
            } else{
                pos = vec3(position.x*(sin((position.y/2. -  .01)*.11)+0.75),position.y,position.z*(sin((position.y/2. -  .01)*.11)+0.75));
            }
            gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 ); 
            ${THREE.ShaderChunk.logdepthbuf_vertex}
        }`,
      fragmentShader: `\
        
        
        ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
        varying vec2 vUv;
        uniform sampler2D perlinnoise;
        uniform vec3 color;
        uniform float strength;
        uniform float uTime;
    
        vec3 rgbcol(vec3 col) {
            return vec3(col.r/255.,col.g/255.,col.b/255.);
        }
    
        void main() {
            vec3 noisetex = texture2D(perlinnoise,vec2(vUv.x,mod(vUv.y+(20.*uTime),1.))).rgb;    
            gl_FragColor = vec4(noisetex.rgb,1.0);
    
            if(gl_FragColor.r >= 0.5){
                gl_FragColor = vec4(color,(0.9-vUv.y)/3.);
            }else{
                gl_FragColor = vec4(0.,0.,1.,0.);
            }
            gl_FragColor *= vec4(sin(vUv.y) - strength);
            gl_FragColor *= vec4(smoothstep(0.01,0.928,vUv.y));
            gl_FragColor.b*=20.;
            gl_FragColor.a*=20.;
            ${THREE.ShaderChunk.logdepthbuf_fragment}
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,

      clipping: false,
      fog: false,
      lights: false,
    });
    material.freeze();

    const material2 = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          type: 'f',
          value: 0.0,
        },
        perlinnoise: {
          type: 't',
          value: wave20,
        },
        strength: {
          value: 0.01,
        },
        color: {
          value: new THREE.Vector3(0.25, 0.45, 1.25),
        },

      },
      vertexShader: `\
          
        ${THREE.ShaderChunk.common}
        ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
        
      
        varying vec2 vUv;
        varying vec3 vPos;

        void main() {
            vUv = uv;
            vPos=position;
            vec3 pos = vec3(position.x,position.y,position.z);
            if(pos.y >= 1.87){
                pos = vec3(position.x*(sin((position.y - 0.6)*1.27)-0.16),position.y,position.z*(sin((position.y - 0.6)*1.27)-0.16));
            } else{
                pos = vec3(position.x*(sin((position.y/2. -  .01)*.11)+0.75),position.y,position.z*(sin((position.y/2. -  .01)*.11)+0.75));
            }
            gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 ); 
            ${THREE.ShaderChunk.logdepthbuf_vertex}
        }`,
      fragmentShader: `\
        
        ${THREE.ShaderChunk.emissivemap_pars_fragment}
        ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
        varying vec2 vUv;
        varying vec3 vPos;
        uniform sampler2D perlinnoise;
        uniform vec3 color;
        uniform float uTime;
        uniform float strength;
        
              #define PI 3.1415926

              float pat(vec2 uv,float p,float q,float s,float glow)
              {
                  float z =  cos(p * uv.y/0.5) + cos(q  * uv.y/2.2) ;

                  z += mod((uTime*100.0 + uv.x+uv.y * s*10.)*0.5,5.0); // +wobble
                  float dist=abs(z)*(.1/glow);
                  return dist;
              }

        
        void main() {
                    


            vec2 uv = vPos.zy;
            float d = pat(uv, 1.0, 2.0, 10.0, 0.35);
            vec3 col = color*0.5/d;
            vec4 fragColor = vec4(col,1.0);

            vec3 noisetex = texture2D(
                perlinnoise,
                mod(1.*vec2(1.*vUv.x+uTime*10.,1.5*vUv.y + uTime*10.),1.)
            ).rgb; 

            gl_FragColor = vec4(noisetex.rgb,1.0);
            
            if(gl_FragColor.r >= 0.1){
                gl_FragColor = fragColor;
            }else{
                gl_FragColor = vec4(0.,0.,1.,0.);
            }
            
            gl_FragColor *= vec4(sin(vUv.y) - strength);
            gl_FragColor *= vec4(smoothstep(0.01,0.928,vUv.y));
            gl_FragColor.xyz /=4.;
            gl_FragColor.b*=2.;
            gl_FragColor.a*=20.;

            
            ${THREE.ShaderChunk.logdepthbuf_fragment}
            ${THREE.ShaderChunk.emissivemap_fragment}
        }`,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,

      clipping: false,
      fog: false,
      lights: false,
    });
    material2.freeze();

    const frontwave = new THREE.Mesh(geometry, material);
    frontwave.position.y = 0;
    frontwave.setRotationFromAxisAngle(new THREE.Vector3(1, 0, 0), -90 * Math.PI / 180);

    const frontwave2 = new THREE.Mesh(geometry, material2);
    frontwave2.position.y = 0;
    frontwave2.setRotationFromAxisAngle(new THREE.Vector3(1, 0, 0), -90 * Math.PI / 180);

    sceneLowPriority.add(frontwave);
    sceneLowPriority.add(frontwave2);

    useFrame(({timestamp}) => {
      const useAction = useLocalPlayer().getAction('use');
      if (useAction?.index === 4) {
        frontwave.visible = true;
        frontwave2.visible = true;

        material.uniforms.uTime.value = timestamp / 5000;
        material2.uniforms.uTime.value = timestamp / 10000;

        frontwave.matrixWorld.copy(subApp.matrixWorld);
        frontwave2.matrixWorld.copy(subApp.matrixWorld);
      } else {
        frontwave.visible = false;
        frontwave2.visible = false;
      }
    });
  };
  makeFrontWave();

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
    /* subApp.position.copy(app.position);
    subApp.quaternion.copy(app.quaternion);
    subApp.scale.copy(app.scale); */
    app.add(subApp);
    subApp.updateMatrixWorld();
    subApp.contentId = u2;
    subApp.instanceId = app.instanceId;

    for (const {key, value} of components) {
      subApp.setComponent(key, value);
    }
    await subApp.addModule(m);
  })());

  /* useActivate(() => {
    const localPlayer = useLocalPlayer();
    localPlayer.wear(app);
  }); */

  let wearing = false;
  useWear(e => {
    const {wear} = e;
    if (subApp) {
      /* if (!wear) {
        subApp.position.copy(app.position);
        subApp.quaternion.copy(app.quaternion);
        subApp.scale.copy(app.scale);
        subApp.updateMatrixWorld();
      } */

      /* subApp.dispatchEvent({
        type: 'wearupdate',
        wear,
      }); */
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
    /* if (!wearing) {
      if (subApp) {
        subApp.position.copy(app.position);
        subApp.quaternion.copy(app.quaternion);
        subApp.updateMatrixWorld();
      }
    } else {
      if (subApp) {
        app.position.copy(subApp.position);
        app.quaternion.copy(subApp.quaternion);
        app.updateMatrixWorld();
      }
    } */

    // if (trailMesh && subApp) {
    //   trailMesh.update(using, subApp.matrixWorld);
    //   trailMesh2.update(using, subApp.matrixWorld);
    // }
    if (decalMesh) {
      // const localPlayer = useLocalPlayer();
      if (subApp && localPlayer.avatar) {
        decalMesh.update(using, subApp.matrixWorld, localPlayer.avatar.modelBones.Right_arm.matrixWorld);
      }

      decalMesh.pushGeometryUpdate();
    }
  });

  useCleanup(() => {
    // trailMesh && sceneLowPriority.remove(trailMesh);
    // trailMesh2 && sceneLowPriority.remove(trailMesh2);
    decalMesh && scene.remove(decalMesh);
    subApp && subApp.destroy();
  });

  app.getPhysicsObjects = () => subApp ? subApp.getPhysicsObjects() : [];

  return app;
};

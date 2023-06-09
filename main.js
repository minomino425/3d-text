// 必要なモジュールを読み込み
import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// DOM がパースされたことを検出するイベントで App3 クラスをインスタンス化する
window.addEventListener(
  "DOMContentLoaded",
  () => {
    const app = new App3();

    // 画像をロードしテクスチャを初期化する（Promise による非同期処理） @@@
    app.load().then(() => {
      // ロードが終わってから初期化し、描画する
      app.init();
      app.render();
    });
  },
  false
);

/**
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
class App3 {
  /**
   * カメラ定義のための定数
   */
  static get CAMERA_PARAM() {
    return {
      fovy: 60,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 20.0,
      x: 0.0,
      y: 2.0,
      z: 10.0,
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    };
  }
  /**
   * レンダラー定義のための定数
   */
  static get RENDERER_PARAM() {
    return {
      clearColor: 0xf8ec9d,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  /**
   * ディレクショナルライト定義のための定数
   */
  static get DIRECTIONAL_LIGHT_PARAM() {
    return {
      color: 0xffffff, // 光の色
      intensity: 1.0, // 光の強度
      x: 1.0, // 光の向きを表すベクトルの X 要素
      y: 1.0, // 光の向きを表すベクトルの Y 要素
      z: 1.0, // 光の向きを表すベクトルの Z 要素
    };
  }
  /**
   * アンビエントライト定義のための定数
   */
  static get AMBIENT_LIGHT_PARAM() {
    return {
      color: 0xffffff, // 光の色
      intensity: 0.2, // 光の強度
    };
  }
  /**
   * マテリアル定義のための定数
   */
  static get MATERIAL_PARAM() {
    return {
      color: 0xf6c0b3, // マテリアルの基本色 @@@
    };
  }
  /**
   * フォグの定義のための定数
   */
  static get FOG_PARAM() {
    return {
      fogColor: 0xffffff, // フォグの色
      fogNear: 10.0, // フォグの掛かり始めるカメラからの距離
      fogFar: 20.0, // フォグが完全に掛かるカメラからの距離
    };
  }

  /**
   * コンストラクタ
   * @constructor
   */
  constructor() {
    this.renderer; // レンダラ
    this.scene; // シーン
    this.camera; // カメラ
    this.directionalLight; // ディレクショナルライト
    this.ambientLight; // アンビエントライト
    this.material; // マテリアル
    this.textGeometry; // トーラスジオメトリ
    this.torusArray; // トーラスメッシュの配列
    this.controls; // オービットコントロール
    this.axesHelper; // 軸ヘルパー
    this.group; // グループ
    this.font; // フォント

    this.isDown = false; // キーの押下状態を保持するフラグ

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener(
      "keydown",
      (keyEvent) => {
        switch (keyEvent.key) {
          case " ":
            this.isDown = true;
            break;
          default:
        }
      },
      false
    );
    window.addEventListener(
      "keyup",
      (keyEvent) => {
        this.isDown = false;
      },
      false
    );

    // リサイズイベント
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  /**
   * アセット（素材）のロードを行う Promise @@@
   */
  load() {
    return new Promise((resolve) => {
      // 読み込む画像のパス
      const fontPath = "./font.json";
      // テクスチャ用のローダーのインスタンスを生成
      const loader = new FontLoader();
      // ローダーの load メソッドに読み込む画像のパスと、ロード完了時のコールバックを指定
      loader.load(fontPath, (path) => {
        console.log(path);
        // コールバック関数の引数として、初期化済みのテクスチャオブジェクトが渡されてくる
        this.font = path;
        // Promise を解決
        resolve();
      });
    });
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(
      new THREE.Color(App3.RENDERER_PARAM.clearColor)
    );
    this.renderer.setSize(
      App3.RENDERER_PARAM.width,
      App3.RENDERER_PARAM.height
    );
    const wrapper = document.querySelector("#webgl");
    wrapper.appendChild(this.renderer.domElement);

    // シーンとフォグ
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      App3.CAMERA_PARAM.fovy,
      App3.CAMERA_PARAM.aspect,
      App3.CAMERA_PARAM.near,
      App3.CAMERA_PARAM.far
    );
    this.camera.position.set(
      App3.CAMERA_PARAM.x,
      App3.CAMERA_PARAM.y,
      App3.CAMERA_PARAM.z
    );
    this.camera.lookAt(App3.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      App3.DIRECTIONAL_LIGHT_PARAM.color,
      App3.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.set(
      App3.DIRECTIONAL_LIGHT_PARAM.x,
      App3.DIRECTIONAL_LIGHT_PARAM.y,
      App3.DIRECTIONAL_LIGHT_PARAM.z
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      App3.AMBIENT_LIGHT_PARAM.color,
      App3.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // マテリアル
    // this.material = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM);
    this.material = this.getMaterial();

    // グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // トーラスメッシュ
    this.textGeometry = new TextGeometry("HELLOHELLOHELLOHELLOHELLO", {
      font: this.font,
      size: 0.2,
      height: 0.5,
      curveSegments: 100,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 10,
      bevelEnabled: false,
    });

    this.textGeometry.center();
    this.textGeometry.computeBoundingBox();

    const text = new THREE.Mesh(this.textGeometry, this.material);
    this.scene.add(text);
    console.log(text);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);
  }

  getMaterial() {
    let matcaptexture = new THREE.TextureLoader().load("./matcap-porcelain-white.jpg");
    matcaptexture.needsUpdate = true;
    let header = `
    varying vec3 vPosition;
      varying float vDebug;
      uniform float uOffset;
      uniform float uTwistSpeed;
      uniform float uRotateSpeed;
      uniform float uTwists;
      uniform float uRadius;
      uniform vec3 uMin;
      uniform vec3 uMax;
      uniform float time;
      float radius = 1.5;
      float twists = 2.;
      float PI = 3.141592653589793238;
mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
	mat4 m = rotationMatrix(axis, angle);
	return (m * vec4(v, 1.0)).xyz;
}
float mapRange(float value, float min1, float max1, float min2, float max2) {
  // return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
  return clamp( min2 + (value - min1) * (max2 - min2) / (max1 - min1), min2, max2 );
}
`;
    let normals = `
          // objectNormal
          vPosition = position;
          
          float xx = mapRange(vPosition.x, uMin.x, uMax.x, -1., 1.0);
          // twistnormal
          objectNormal = rotate(objectNormal, vec3(1.,0.,0.), 0.5*PI*uTwists*xx + 0.01*time*uTwistSpeed);
  
          // circled normal
          objectNormal = rotate(objectNormal, vec3(0.,0.,1.), (xx + 0.01*time*uRotateSpeed)*PI);
`;
    let geometry = `
        vec3 pos = transformed;
         
        // twist 
        float xxx = mapRange(position.x, uMin.x, uMax.x, -1., 1.);

        //circle
        float theta = (xxx + 0.01*time*uRotateSpeed)*PI;
        pos = rotate(pos,vec3(1.,0.,0.), 0.5*PI*uTwists*xxx + 0.01*time*uTwistSpeed);        
        vec3 dir = vec3(sin(theta), cos(theta),pos.z);
        vec3 circled = vec3(dir.xy*uRadius,pos.z) + vec3(pos.y*dir.x,pos.y*dir.y,0.);
        transformed = circled;
        `;
    this.uniforms = {
      uOffset: { value: 0 },
      time: {
        value: 0,
      },
      uRadius: {
        value: 2,
      },
      uTwists: {
        value: 2,
      },
      uTwistSpeed: {
        value: 1,
      },
      uRotateSpeed: {
        value: 1,
      },
      uMin: {
        value: { x: -1, y: 0, z: 0 },
      },
      uMax: {
        value: { x: 1, y: 0, z: 0 },
      },
    };

    let material = new THREE.MeshMatcapMaterial({
      matcap: matcaptexture,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...this.uniforms };
      shader.vertexShader = header + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>" + normals
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>" + geometry
      );
      material.userData.shader = shader;
    };

    return material;
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      this.group.rotation.y += 0.05;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}

export const shaderChange = {
  heightmap_frag: /* glsl */ `
				#include <common>
				precision mediump float;

				uniform vec2 mousePos;
				uniform float mouseSize;
				uniform float viscosity;
				uniform float deep;

				void main()	{

					vec2 cellSize = 1.0 / resolution.xy;

					vec2 uv = gl_FragCoord.xy * cellSize;

					// heightmapValue.x == height from previous frame
					// heightmapValue.y == height from penultimate frame
					// heightmapValue.z, heightmapValue.w not used
					vec4 heightmapValue = texture2D( heightmap, uv );

					// Get neighbours
					vec4 north = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) );
					vec4 south = texture2D( heightmap, uv + vec2( 0.0, - cellSize.y ) );
					vec4 east = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) );
					vec4 west = texture2D( heightmap, uv + vec2( - cellSize.x, 0.0 ) );

					//float newHeight = ( ( north.x + south.x + east.x + west.x ) * 0.5 - heightmapValue.y ) * viscosity;
					float newHeight = ( ( north.x + south.x + east.x + west.x ) * 0.5 - (heightmapValue.y) ) * viscosity;


					// Mouse influence
					vec2 mouseDelta = ( uv - vec2( 0.5 ) ) * BOUNDS - vec2( mousePos.x, -mousePos.y );
					float influence = 1.0 - smoothstep( 0.0, mouseSize, length( mouseDelta ) );
					newHeight -= influence * deep;

					heightmapValue.y = heightmapValue.x;
					heightmapValue.x = newHeight;

					gl_FragColor = heightmapValue;

				}
				`,
  // FOR MATERIAL
  common: /* glsl */ `
				#include <common>
				uniform sampler2D heightmap;
				float waveHeight;
				`,
  beginnormal_vertex: /* glsl */ `
				vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );
				waveHeight = texture2D( heightmap, uv ).x;
				float eastHeight = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) ).x;
				float northHeight = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) ).x;
				vec3 objectNormal = vec3(
				( waveHeight - eastHeight ) * WIDTH / BOUNDS,
				( waveHeight - northHeight ) * WIDTH / BOUNDS,
				1.0 );
				#ifdef USE_TANGENT
					vec3 objectTangent = vec3( tangent.xyz );
				#endif
				`,
  begin_vertex: /* glsl */ `
				vec3 transformed = vec3( position.x, position.y, waveHeight );
				#ifdef USE_ALPHAHASH
					vPosition = vec3( position );
				#endif
				`,
};

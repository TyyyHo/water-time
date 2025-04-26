export const shaderChange = {
  heightmap_frag: /* glsl */ `
				#include <common>

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
					float mousePhase = clamp( length( ( uv - vec2( 0.5 ) ) * BOUNDS - vec2( mousePos.x, - mousePos.y ) ) * PI / mouseSize, 0.0, PI );
					//newHeight += ( cos( mousePhase ) + 1.0 ) * 0.28 * 10.0;
					newHeight -= ( cos( mousePhase ) + 1.0 ) * deep;

					heightmapValue.y = heightmapValue.x;
					heightmapValue.x = newHeight;

					gl_FragColor = heightmapValue;

				}
				`,
  // FOR MATERIAL
  common: /* glsl */ `
				#include <common>
				uniform sampler2D heightmap;
				`,
  beginnormal_vertex: /* glsl */ `
				vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );
				vec3 objectNormal = vec3(
				( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
				( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,
				1.0 );
				#ifdef USE_TANGENT
					vec3 objectTangent = vec3( tangent.xyz );
				#endif
				`,
  begin_vertex: /* glsl */ `
				float heightValue = texture2D( heightmap, uv ).x;
				vec3 transformed = vec3( position.x, position.y, heightValue );
				#ifdef USE_ALPHAHASH
					vPosition = vec3( position );
				#endif
				`,
};

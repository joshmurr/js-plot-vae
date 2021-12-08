const pointsVert = `#version 300 es
precision mediump float;

in vec3 i_Position;

uniform mat4 u_ProjectionMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ModelMatrix;

void main(){
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vec4(i_Position, 1.0);
    gl_PointSize = (gl_Position.z * -1.0) + 6.0;
}`

const pointsFrag = `#version 300 es
precision mediump float;

out vec4 OUTCOLOUR;

void main(){
    float distance = length(2.0 * gl_PointCoord - 1.0);
    if (distance > 0.5) {
            discard;
    }
    OUTCOLOUR = vec4(0.0, 0.0, 0.0, 1.0);
}`

const latentPointsVert = `#version 300 es
precision mediump float;

in vec3 i_Position;
in vec3 i_Color;

uniform mat4 u_ProjectionMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ModelMatrix;

out vec3 v_Color;

void main(){
    v_Color = i_Color;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vec4(i_Position, 1.0);
    gl_PointSize = (gl_Position.z * -1.0) + 6.0;
}`

const latentPointsFrag = `#version 300 es
precision mediump float;

in vec3 v_Color;
out vec4 OUTCOLOUR;

void main(){
    float distance = length(2.0 * gl_PointCoord - 1.0);
    if (distance > 0.3) {
            discard;
    }
    OUTCOLOUR = vec4(v_Color, 1.0);
}`

export { pointsVert, pointsFrag, latentPointsVert, latentPointsFrag }

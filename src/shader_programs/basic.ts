export const pointsVert = `#version 300 es
precision mediump float;

in vec3 i_Position;

uniform mat4 u_ProjectionMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ModelMatrix;

void main(){
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vec4(i_Position, 1.0);
    gl_PointSize = (gl_Position.z * -1.0) + 6.0;
}`

export const pointsFrag = `#version 300 es
precision mediump float;

out vec4 OUTCOLOUR;

void main(){
    float distance = length(2.0 * gl_PointCoord - 1.0);
    if (distance > 0.5) {
        discard;
    }
    OUTCOLOUR = vec4(0.0, 0.0, 0.0, 1.0);
}`

export const latentVert = `#version 300 es
precision mediump float;

in vec3 i_Position;
in vec3 i_Color;
in vec3 i_Uid;

uniform mat4 u_ProjectionMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ModelMatrix;
uniform int u_IdSelected;
uniform float u_PointSize;

out vec3 v_Color;
out vec3 v_Uid;

void main(){
    v_Uid = i_Uid;
    v_Color = i_Color;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vec4(i_Position, 1.0);

    if(u_IdSelected == gl_VertexID) {
        gl_PointSize = (gl_Position.z * -1.0) + u_PointSize * 4.0;
        v_Color *= 0.5;
    } else{
        gl_PointSize = (gl_Position.z * -1.0) + u_PointSize;
    }
}`

export const latentFrag = `#version 300 es
precision mediump float;

in vec3 v_Color;
in vec3 v_Uid;
uniform float u_PointSize;
uniform bool u_UseUid;
out vec4 OUTCOLOUR;

void main(){
    float distance = length(2.0 * gl_PointCoord - 1.0);
    if (distance > u_PointSize * 0.1) {
        discard;
    }
    OUTCOLOUR = u_UseUid ? vec4(v_Uid, 0.0) : vec4(v_Color, 1.0);
}`

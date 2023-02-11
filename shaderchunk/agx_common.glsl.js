export default /*glsl*/`
#define float3 vec3
#define float2 vec2
#define float3x3 mat3
#define mul(a, b) b * a

#define saturate(a) clamp(a, 0.0f, 1.0f)

float3x3 inv_f33(float3x3 m) {
    float d = m[0].x * (m[1].y * m[2].z - m[2].y * m[1].z) -
                m[0].y * (m[1].x * m[2].z - m[1].z * m[2].x) +
                m[0].z * (m[1].x * m[2].y - m[1].y * m[2].x);
    float id = 1.0f / d;
    float3x3 c = float3x3(1,0,0,0,1,0,0,0,1);
    c[0].x = id * (m[1].y * m[2].z - m[2].y * m[1].z);
    c[0].y = id * (m[0].z * m[2].y - m[0].y * m[2].z);
    c[0].z = id * (m[0].y * m[1].z - m[0].z * m[1].y);
    c[1].x = id * (m[1].z * m[2].x - m[1].x * m[2].z);
    c[1].y = id * (m[0].x * m[2].z - m[0].z * m[2].x);
    c[1].z = id * (m[1].x * m[0].z - m[0].x * m[1].z);
    c[2].x = id * (m[1].x * m[2].y - m[2].x * m[1].y);
    c[2].y = id * (m[2].x * m[0].y - m[0].x * m[2].y);
    c[2].z = id * (m[0].x * m[1].y - m[1].x * m[0].y);
    return c;
}


float3 XYZ_to_xyY(float3 xyz, float2 whitepoint)
{
    float sum = xyz.x + xyz.y + xyz.z;
    vec3 xyY = vec3(0, 0, 0);
    if(sum != 0.0)
    {
        xyY.x = xyz.x / sum;
        xyY.y = xyz.y / sum;
        xyY.z = xyz.y;
    }
    else
    {
        xyY.x = whitepoint.x;
        xyY.y = whitepoint.y;
        xyY.z = xyz.y;
    }

    return xyY;
}
float3 xyY_to_XYZ(float3 xyY)
{
    if(xyY.y == 0.0f)
        return float3(0, 0, 0);

    float Y = xyY.z;
    float X = (xyY.x * Y) / xyY.y;
    float Z = ((1.0f - xyY.x - xyY.y) * Y) / xyY.y;

    return float3(X, Y, Z);
}

float3 unproject(float2 xy)
{
    return xyY_to_XYZ(float3(xy.x, xy.y, 1));				
}

float3x3 primaries_to_matrix(float2 xy_red, float2 xy_green, float2 xy_blue, float2 xy_white)
{
    float3 XYZ_red = unproject(xy_red);
    float3 XYZ_green = unproject(xy_green);
    float3 XYZ_blue = unproject(xy_blue);
    
    float3 XYZ_white = unproject(xy_white);
    
    float3x3 temp = float3x3(
                XYZ_red.x,	XYZ_green.x,	XYZ_blue.x,
                1.0f,	1.0f,	1.0f,
                XYZ_red.z,	XYZ_green.z,	XYZ_blue.z);

    float3x3 inverse = inv_f33(temp);
    float3 scale = mul(inverse, XYZ_white);
    
    return float3x3(
        scale.x * XYZ_red.x, scale.y * XYZ_green.x,	scale.z * XYZ_blue.x,
        scale.x * XYZ_red.y, scale.y * XYZ_green.y,	scale.z * XYZ_blue.y,
        scale.x * XYZ_red.z, scale.y * XYZ_green.z,	scale.z * XYZ_blue.z);
}

float3x3 ComputeCompressionMatrix(float2 xyR, float2 xyG, float2 xyB, float2 xyW, float compression)
{
    float scale_factor = 1.0f / (1.0f - compression);
    float2 R = ((xyR - xyW) * scale_factor) + xyW;
    float2 G = ((xyG - xyW) * scale_factor) + xyW;
    float2 B = ((xyB - xyW) * scale_factor) + xyW;
    float2 W = xyW;

    return primaries_to_matrix(R, G, B, W);
}


float3 open_domain_to_normalized_log2(float3 in_od, float minimum_ev, float maximum_ev)
{
    const float middle_grey = 0.18f;
    float total_exposure = maximum_ev - minimum_ev;

    float3 output_log = clamp(log2(in_od / middle_grey), minimum_ev, maximum_ev);
    
    return (output_log - minimum_ev) / total_exposure;
}


float equation_scale(float x_pivot, float y_pivot, float slope_pivot, float power)
{
    return pow(pow((slope_pivot * x_pivot), -power) * (pow((slope_pivot * (x_pivot / y_pivot)), power) - 1.0), -1.0 / power);
}

float equation_hyperbolic(float x, float power)
{
    return x / pow(1.0 + pow(x, power), 1.0f / power);
}

float equation_term(float x, float x_pivot, float slope_pivot, float scale)
{
    return (slope_pivot * (x - x_pivot)) / scale;
}

float equation_curve(float x, float x_pivot, float y_pivot, float slope_pivot, float toe_power, float shoulder_power, float scale)
{
    if(scale < 0.0f)
    {
        return scale * equation_hyperbolic(equation_term(x, x_pivot, slope_pivot, scale), toe_power) + y_pivot;
    }
    else
    {
        return scale * equation_hyperbolic(equation_term(x,x_pivot,slope_pivot,scale), shoulder_power) + y_pivot;
    }
}

float equation_full_curve(float x, float x_pivot, float y_pivot, float slope_pivot, float toe_power, float shoulder_power)
{
    float scale_x_pivot = x >= x_pivot ? 1.0f - x_pivot : x_pivot;
    float scale_y_pivot = x >= x_pivot ? 1.0f - y_pivot : y_pivot;

    float toe_scale = equation_scale(scale_x_pivot, scale_y_pivot, slope_pivot, toe_power);
    float shoulder_scale = equation_scale(scale_x_pivot, scale_y_pivot, slope_pivot, shoulder_power);				

    float scale = x >= x_pivot ? shoulder_scale : -toe_scale;

    return equation_curve(x, x_pivot, y_pivot, slope_pivot, toe_power, shoulder_power, scale);
}


uniform float min_ev;
uniform float max_ev;
uniform float slope;
uniform float toe_power;
uniform float shoulder_power;

float3 apply_agx(float3 rgb, float compression)
{
    float3x3 sRGB_to_XYZ = primaries_to_matrix(float2(0.64,0.33),
													float2(0.3,0.6), 
													float2(0.15,0.06), 
													float2(0.3127, 0.3290));

    float3x3 adjusted_to_XYZ = ComputeCompressionMatrix(float2(0.64,0.33),
                                                        float2(0.3,0.6), 
                                                        float2(0.15,0.06), 
                                                        float2(0.3127, 0.3290), compression);							

    float3x3 XYZ_to_adjusted = inv_f33(adjusted_to_XYZ);
    float3x3 XYZ_to_sRGB = inv_f33(sRGB_to_XYZ);
    
    float3 xyz = mul(sRGB_to_XYZ, rgb);
    float3 ajustedRGB = mul(XYZ_to_adjusted, xyz);

    //const float slope = 2.3f;
    //const float toe_power = 1.9f;
    //const float shoulder_power = 3.1f;
    //const float min_ev = -10.0f;
    //const float max_ev = 6.5f;

    float x_pivot = abs(min_ev) / (max_ev - min_ev);
    float y_pivot = 0.5f;

    float3 log = open_domain_to_normalized_log2(ajustedRGB, min_ev, max_ev);

    float outputR = equation_full_curve(log.r, x_pivot, y_pivot, slope, toe_power, shoulder_power);
    float outputG = equation_full_curve(log.g, x_pivot, y_pivot, slope, toe_power, shoulder_power);
    float outputB = equation_full_curve(log.b, x_pivot, y_pivot, slope, toe_power, shoulder_power);

    return saturate(float3(outputR, outputG, outputB));
}


float3 apply_saturation(float3 rgb, float saturation)
{
    vec3 wgt = vec3(0.2126729f,  0.7151522f,  0.0721750f); // srgb luminance
    vec3 des = vec3(dot(rgb, wgt));
    return mix(des, rgb, saturation);
}
`;
import * as THREE from 'three';
import * as Utils from './utils.js'

export function ComputeCompressionMatrix(xyR, xyG, xyB, xyW, compression)
{
    var scale_factor = 1 / (1 - compression);
    var R = new THREE.Vector2(xyR.x, xyR.y).sub(xyW).multiplyScalar(scale_factor).add(xyW);
    var G = new THREE.Vector2(xyG.x, xyG.y).sub(xyW).multiplyScalar(scale_factor).add(xyW);
    var B = new THREE.Vector2(xyB.x, xyB.y).sub(xyW).multiplyScalar(scale_factor).add(xyW);
    var W = new THREE.Vector2(xyW.x, xyW.y);

    return Utils.primaries_to_matrix(R, G, B, W);
}


function equation_scale(x_pivot, y_pivot, slope_pivot, power)
{
    return Math.pow(Math.pow((slope_pivot * x_pivot), -power) * (Math.pow((slope_pivot * (x_pivot / y_pivot)), power) - 1.0), -1.0 / power);
}

function equation_hyperbolic(x, power)
{
    return x / Math.pow(1.0 + Math.pow(x, power), 1.0 / power);
}

function equation_term(x, x_pivot, slope_pivot, scale)
{
    return (slope_pivot * (x - x_pivot)) / scale;
}

function equation_curve(x, x_pivot, y_pivot, slope_pivot, toe_power, shoulder_power, scale)
{
    if(scale < 0.0)
    {
        return scale * equation_hyperbolic(equation_term(x, x_pivot, slope_pivot, scale), toe_power) + y_pivot;
    }
    else
    {
        return scale * equation_hyperbolic(equation_term(x,x_pivot,slope_pivot,scale), shoulder_power) + y_pivot;
    }
}

function equation_full_curve(x, x_pivot, y_pivot, slope_pivot, toe_power, shoulder_power)
{
    var scale_x_pivot = x >= x_pivot ? 1 - x_pivot : x_pivot;
    var scale_y_pivot = x >= x_pivot ? 1 - y_pivot : y_pivot;

    var toe_scale = equation_scale(scale_x_pivot, scale_y_pivot, slope_pivot, toe_power);
    var shoulder_scale = equation_scale(scale_x_pivot, scale_y_pivot, slope_pivot, shoulder_power);				

    var scale = x >= x_pivot ? shoulder_scale : -toe_scale;

    return equation_curve(x, x_pivot, y_pivot, slope_pivot, toe_power, shoulder_power, scale);
}

var adjusted_to_XYZ = ComputeCompressionMatrix(Utils.sRGB_Space.red, Utils.sRGB_Space.green, Utils.sRGB_Space.blue, Utils.sRGB_Space.white, 0.10);
var XYZ_to_adjusted = adjusted_to_XYZ.clone().invert();

export function setCompressionMatrix(compression)
{
    adjusted_to_XYZ = ComputeCompressionMatrix(Utils.sRGB_Space.red, Utils.sRGB_Space.green, Utils.sRGB_Space.blue, Utils.sRGB_Space.white, compression);
    XYZ_to_adjusted = adjusted_to_XYZ.clone().invert();
}



export function applyTransform(rgb, slope, toe_power, shoulder_power, min_ev, max_ev)
{
    var xyz = rgb.clone().applyMatrix3(Utils.sRGB_to_XYZ);
    var ajustedRGB = xyz.clone().applyMatrix3(XYZ_to_adjusted);

    ajustedRGB = ajustedRGB.clone().max(new THREE.Vector3(0, 0, 0));

    const x_pivot = Math.abs(min_ev) / (max_ev - min_ev);
    const y_pivot = 0.5;

    var logR = Utils.open_domain_to_normalized_log2(ajustedRGB.x, min_ev, max_ev);
    var logG = Utils.open_domain_to_normalized_log2(ajustedRGB.y, min_ev, max_ev);
    var logB = Utils.open_domain_to_normalized_log2(ajustedRGB.z, min_ev, max_ev);

    var outputR = equation_full_curve(logR, x_pivot, y_pivot, slope, toe_power, shoulder_power);
    var outputG = equation_full_curve(logG, x_pivot, y_pivot, slope, toe_power, shoulder_power);
    var outputB = equation_full_curve(logB, x_pivot, y_pivot, slope, toe_power, shoulder_power);

    return new THREE.Vector3(outputR, outputG, outputB);
}
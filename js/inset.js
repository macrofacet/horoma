
function ComputeCompressionMatrix(xyR, xyG, xyB, xyW, compression)
{
    var scale_factor = 1 / (1 - compression);
    var R = new THREE.Vector2(xyR.x, xyR.y).sub(xyW).multiplyScalar(scale_factor).add(xyW);
    var G = new THREE.Vector2(xyG.x, xyG.y).sub(xyW).multiplyScalar(scale_factor).add(xyW);
    var B = new THREE.Vector2(xyB.x, xyB.y).sub(xyW).multiplyScalar(scale_factor).add(xyW);
    var W = new THREE.Vector2(xyW.x, xyW.y);

    return primaries_to_matrix(R, G, B, W);
}

var sRGB_to_XYZ = primaries_to_matrix(new THREE.Vector2(0.64,0.33),
                                            new THREE.Vector2(0.3,0.6), 
                                            new THREE.Vector2(0.15,0.06), 
                                            new THREE.Vector2(0.3127, 0.3290));

var adjusted_to_XYZ = ComputeCompressionMatrix(new THREE.Vector2(0.64,0.33),
                                            new THREE.Vector2(0.3,0.6), 
                                            new THREE.Vector2(0.15,0.06), 
                                            new THREE.Vector2(0.3127, 0.3290), 0.10);

var XYZ_to_adjusted = new THREE.Matrix3().getInverse(adjusted_to_XYZ);

var XYZ_to_sRGB = new THREE.Matrix3().getInverse(sRGB_to_XYZ);

function open_domain_to_normalized_log2(in_od, minimum_ev, maximum_ev)
{
    const in_middle_grey = 0.18;
    var total_exposure = maximum_ev - minimum_ev;

    var output_log = Math.min(maximum_ev, Math.max(minimum_ev, Math.log2(in_od / in_middle_grey)));
    
    return (output_log - minimum_ev) / total_exposure;
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

function applyInsetTransform(rgb, slope, toe_power, shoulder_power, min_ev, max_ev)
{
    var xyz = rgb.applyMatrix3(sRGB_to_XYZ);
    var ajustedRGB = xyz.applyMatrix3(XYZ_to_adjusted);

    const x_pivot = Math.abs(min_ev) / (max_ev - min_ev);
    const y_pivot = 0.5;

    var logR = open_domain_to_normalized_log2(ajustedRGB.x, min_ev, max_ev);
    var logG = open_domain_to_normalized_log2(ajustedRGB.y, min_ev, max_ev);
    var logB = open_domain_to_normalized_log2(ajustedRGB.z, min_ev, max_ev);

    var outputR = equation_full_curve(logR, x_pivot, y_pivot, slope, toe_power, shoulder_power);
    var outputG = equation_full_curve(logG, x_pivot, y_pivot, slope, toe_power, shoulder_power);
    var outputB = equation_full_curve(logB, x_pivot, y_pivot, slope, toe_power, shoulder_power);

    return new THREE.Vector3(outputR, outputG, outputB);
}
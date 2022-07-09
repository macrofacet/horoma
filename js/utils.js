function XYZ_to_xyY(XYZColor, whitePoint)
{
    var XYZ = XYZColor;
    var sum = XYZ.x + XYZ.y + XYZ.z;
    var xyY = new THREE.Vector3(0, 0, 0);
    if(sum != 0.0)
    {
        xyY.x = XYZ.x / sum;
        xyY.y = XYZ.y / sum;
        xyY.z = XYZ.y;
    }
    else
    {
        xyY.x = whitePoint.x;
        xyY.y = whitePoint.y;
        xyY.z = XYZ.y;
    }
    return xyY;
}

function xyY_to_XYZ(xyY)
{
    if(xyY.y == 0)
        return new THREE.Vector3(0, 0, 0);

    var Y = xyY.z;
    var X = (xyY.x * Y) / xyY.y;
    var Z = ((1 - xyY.x - xyY.y) * Y) / xyY.y;

    return new THREE.Vector3(X, Y, Z);
}

function unproject(xy)
{
    return xyY_to_XYZ(new THREE.Vector3(xy.x, xy.y, 1));				
}

// https://mina86.com/2019/srgb-xyz-matrix/
function primaries_to_scale_vector(xy_red, xy_green, xy_blue, xy_white)
{
    var XYZ_red = unproject(xy_red);
    var XYZ_green = unproject(xy_green);
    var XYZ_blue = unproject(xy_blue);
    
    var XYZ_white = unproject(xy_white);
    
    var temp = new THREE.Matrix3();
    temp.set( 	XYZ_red.x,	XYZ_green.x,	XYZ_blue.x,
                1,	1,	1,
                XYZ_red.z,	XYZ_green.z,	XYZ_blue.z,);
    var inverse = new THREE.Matrix3().getInverse(temp);
    return XYZ_white.applyMatrix3(inverse);
}

function primaries_to_matrix(xy_red, xy_green, xy_blue, xy_white)
{
    var XYZ_red = unproject(xy_red);
    var XYZ_green = unproject(xy_green);
    var XYZ_blue = unproject(xy_blue);
    
    var XYZ_white = unproject(xy_white);
    
    var temp = new THREE.Matrix3();
    temp.set( 	XYZ_red.x,	XYZ_green.x,	XYZ_blue.x,
                1,	1,	1,
                XYZ_red.z,	XYZ_green.z,	XYZ_blue.z,);
    var inverse = new THREE.Matrix3().getInverse(temp);
    var scale = XYZ_white.applyMatrix3(inverse);
    
    var out = new THREE.Matrix3();
    out.set( 	scale.x * XYZ_red.x, scale.y * XYZ_green.x,	scale.z * XYZ_blue.x,
                scale.x * XYZ_red.y, scale.y * XYZ_green.y,	scale.z * XYZ_blue.y,
                scale.x * XYZ_red.z, scale.y * XYZ_green.z,	scale.z * XYZ_blue.z,)
    return out;
}


function lerp(a, b, t)
{
    return (1 - t) * a + t * b;
}




var sRGB_to_XYZ = primaries_to_matrix(new THREE.Vector2(0.64,0.33),
                                            new THREE.Vector2(0.3,0.6), 
                                            new THREE.Vector2(0.15,0.06), 
                                            new THREE.Vector2(0.3127, 0.3290));
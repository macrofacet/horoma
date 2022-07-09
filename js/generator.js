function GenerateRamp(numStepsRGB, numStepsExp, startExp, rangeExp)
{
    var output = [];
    for ( let k = 0; k < 3; k ++ )
    {
        for ( let a = 0; a <= numStepsRGB; a ++ )
        {
            for ( let b = 0; b <= numStepsRGB; b ++ )
            {
                for ( let i = startExp; i <= startExp + rangeExp; i ++ )
                {
                    for(let j = 0; j <= numStepsExp; j++)
                    {
                        var ex = Math.pow(2, i + (j / numStepsExp));
                        var ratio = new THREE.Vector3();

                        if(k == 0)
                        {
                            ratio.x = 1;
                            ratio.y = a / numStepsRGB;
                            ratio.z = b / numStepsRGB;
                        }
                        else if(k == 1)
                        {
                            ratio.x = a / numStepsRGB;
                            ratio.y = 1;
                            ratio.z = b / numStepsRGB;
                        }
                        else if(k == 2)
                        {
                            ratio.x = a / numStepsRGB;
                            ratio.y = b / numStepsRGB;
                            ratio.z = 1;
                        }

                        var p = ratio.clone().multiplyScalar(ex);
                        output.push(p);
                    }
                }
            }
        }
    }
    return output;
}

/*
if(params.colorIndex == -1 || counter == params.colorIndex)
{
    positions.push( fp.x, fp.y, fp.z );

    if(counter == params.colorIndex)
    {
        params.ratio_r = ratio.x;
        params.ratio_g = ratio.y;
        params.ratio_b = ratio.z;
    }
}

*/
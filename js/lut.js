// https://wwwimages2.adobe.com/content/dam/acom/en/products/speedgrade/cc/pdfs/cube-lut-specification-1.0.pdf

import {
	Vector3
} from 'three';

export class LUTCube 
{
	constructor()
	{
		this.title = "lut";
		this.domainMin = new Vector3(0, 0, 0);
		this.domainMax = new Vector3(1, 1, 1);
		this.size = 0;
		this.data = [];
	}
	array_lookup(x, y, z)
	{
		var idx =  x + y * this.size + z * this.size * this.size;
		return this.data[idx];
	}

	trilinear_lookup(rgb)
	{
		var xc = Math.max(0, Math.floor(rgb.x * this.size - 0.5));
		var yc = Math.max(0, Math.floor(rgb.y * this.size - 0.5));
		var zc = Math.max(0, Math.floor(rgb.z * this.size - 0.5));

		return this.array_lookup(xc, yc, zc);

	}
}

export class LUTCubeParser {

	parse( str ) {

        var lut = new LUTCube();

		// Remove empty lines and comments
		str = str
			.replace( /^#.*?(\n|\r)/gm, '' )
			.replace( /^\s*?(\n|\r)/gm, '' )
			.trim();

		const lines = str.split( /[\n\r]+/g );
		let data = null;

		let currIndex = 0;
		for ( let i = 0, l = lines.length; i < l; i ++ ) {

			const line = lines[ i ].trim();
			const split = line.split( /\s/g );

			switch ( split[ 0 ] ) {

				case 'TITLE':
					lut.title = line.substring( 7, line.length - 1 );
					break;
				case 'LUT_3D_SIZE':
					const sizeToken = split[ 1 ];
					lut.size = parseFloat( sizeToken );
					lut.data = new Array( lut.size * lut.size * lut.size);
					break;
				case 'DOMAIN_MIN':
					lut.domainMin.x = parseFloat( split[ 1 ] );
					lut.domainMin.y = parseFloat( split[ 2 ] );
					lut.domainMin.z = parseFloat( split[ 3 ] );
					break;
				case 'DOMAIN_MAX':
					lut.domainMax.x = parseFloat( split[ 1 ] );
					lut.domainMax.y = parseFloat( split[ 2 ] );
					lut.domainMax.z = parseFloat( split[ 3 ] );
					break;
				default:
					const r = parseFloat( split[ 0 ] );
					const g = parseFloat( split[ 1 ] );
					const b = parseFloat( split[ 2 ] );

					if (
						r > 1.0 || r < 0.0 ||
						g > 1.0 || g < 0.0 ||
						b > 1.0 || b < 0.0
					) {

						throw new Error( 'LUTCubeLoader : Non normalized values not supported.' );

					}

					lut.data[ currIndex ] = new Vector3(r, g, b);
					currIndex ++;
			}
		}
        
        return lut;
	}
}
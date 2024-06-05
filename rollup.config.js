export default [{
    input: 'esm/index.js',
    output: [
        {
            file: 'dist/index.js',
            format: 'umd',
            name: 'frame',
        },
    ],
}];
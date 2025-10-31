module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: '22'
      },
      modules: false
    }]
  ],
  plugins: [
    '@babel/plugin-syntax-import-attributes'
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: '22'
          }
        }]
      ]
    }
  }
};
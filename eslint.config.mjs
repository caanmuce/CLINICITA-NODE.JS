export default [
  {
    ignores: [
      "node_modules/**",
      "ml-service/**",
      "public/**/*.html",
      "public/assets/**/*.css",
    ],
  },
  {
    files: ["server/**/*.js", "test_server.js", "public/assets/js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      "no-constant-condition": "warn",
      "no-debugger": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-unexpected-multiline": "error",
    },
  },
];

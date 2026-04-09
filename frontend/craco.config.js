module.exports = {
  webpack: {
    configure: (config) => {
      const mediaPipeExclude = /node_modules[\\/]@mediapipe/;
      const addExclude = (rule) => {
        if (!rule) return;
        if (Array.isArray(rule.exclude)) {
          rule.exclude.push(mediaPipeExclude);
        } else if (rule.exclude) {
          rule.exclude = [rule.exclude, mediaPipeExclude];
        } else {
          rule.exclude = mediaPipeExclude;
        }
      };
      config.module.rules.forEach((rule) => {
        if (rule.oneOf) {
          rule.oneOf.forEach((r) => {
            if (r.use && Array.isArray(r.use)) {
              r.use.forEach((u) => {
                const loader = (u && u.loader) || (typeof u === "string" ? u : "");
                if (loader.includes("source-map-loader")) addExclude(r);
              });
            }
            if (r.loader && r.loader.includes("source-map-loader")) addExclude(r);
          });
        } else if (rule.loader && rule.loader.includes("source-map-loader")) {
          addExclude(rule);
        }
      });
      return config;
    },
  },
};

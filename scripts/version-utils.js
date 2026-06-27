const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

function parseVersion(version) {
  if (typeof version !== "string" || !SEMVER_PATTERN.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return version.split(".").map((part) => Number(part));
}

export function compareVersions(localVersion, remoteVersion) {
  const localParts = parseVersion(localVersion);
  const remoteParts = parseVersion(remoteVersion);

  for (let index = 0; index < localParts.length; index++) {
    if (localParts[index] > remoteParts[index]) return 1;
    if (localParts[index] < remoteParts[index]) return -1;
  }
  return 0;
}

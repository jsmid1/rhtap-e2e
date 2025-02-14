export interface JenkinsBuild {
    _links: {
        self: { href: string };
    };
    id: string;
    name: string;
    status: 'SUCCESS' | 'FAILURE' | 'IN_PROGRESS' | 'ABORTED' | string;
    startTimeMillis: number;
    endTimeMillis: number;
    durationMillis: number;
    queueDurationMillis: number;
    pauseDurationMillis: number;
    stages: JenkinsBuildStage[];
};

export interface JenkinsBuildStage {
    _links: Record<string, unknown>;
    id: string;
    name: string;
    execNode: string;
    status: 'SUCCESS' | 'FAILURE' | 'IN_PROGRESS' | 'ABORTED' | string;
    startTimeMillis: number;
    durationMillis: number;
    pauseDurationMillis: number;
};

import { useState, useEffect } from "react";
import axios from "axios";
import { env3, MPU6886Object, indexData, heavyLoad } from "./types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

/**
 * 配列を指定した単位で分割する
 * @param arr 分割する配列
 * @param n 分割する単位
 * @returns 分割された配列
 * @example
 * ```ts
 * divideArrIntoPieces([0, 1, 2, 3, 4, 5, 6, 7], 3) // [[0, 1, 2], [3, 4, 5], [6, 7]]
 * ```
 */
const divideArrIntoPieces = <T extends unknown>(
  arr: ReadonlyArray<T>,
  n: number
): ReadonlyArray<ReadonlyArray<T>> => {
  return Array.from({ length: Math.ceil(arr.length / n) }).map((_, index) => {
    return arr.slice(index * n, (index + 1) * n);
  });
};

const calculateMPU6886Average = (
  MPU6886: ReadonlyArray<ReadonlyArray<MPU6886Object>>
): {
  readonly head: ReadonlyArray<number>;
  readonly left: ReadonlyArray<number>;
  readonly right: ReadonlyArray<number>;
} => {
  // diffの値を使うように変更する
  const tempAvgHead: number[] = [];
  const tempAvgRight: number[] = [];
  const tempAvgLeft: number[] = [];

  MPU6886.forEach((data) => {
    let sumHead = 0;
    let sumLeft = 0;
    let sumRight = 0;
    data.forEach((value) => {
      sumHead +=
        Math.abs(value.head.accX) +
        Math.abs(value.head.accY) +
        Math.abs(value.head.accZ) +
        Math.abs(value.head.gyroX) +
        Math.abs(value.head.gyroY) +
        Math.abs(value.head.gyroZ);
      sumLeft +=
        Math.abs(value.left.accX) +
        Math.abs(value.left.accY) +
        Math.abs(value.left.accZ) +
        Math.abs(value.left.gyroX) +
        Math.abs(value.left.gyroY) +
        Math.abs(value.left.gyroZ);
      sumRight +=
        Math.abs(value.right.accX) +
        Math.abs(value.right.accY) +
        Math.abs(value.right.accZ) +
        Math.abs(value.right.gyroX) +
        Math.abs(value.right.gyroY) +
        Math.abs(value.right.gyroZ);
    });
    tempAvgHead.push(sumHead / data.length);
    tempAvgRight.push(sumRight / data.length);
    tempAvgLeft.push(sumLeft / data.length);
  });

  return {
    head: tempAvgHead,
    left: tempAvgLeft,
    right: tempAvgRight,
  };
};

const labels = [1, 2, 3, 4, 5];

const calculateMPU6886AverageChartData = (
  MPU6886: ReadonlyArray<ReadonlyArray<MPU6886Object>>
): ChartData<"line", ReadonlyArray<number>, number> => {
  const MPU6886Average = calculateMPU6886Average(MPU6886);
  return {
    labels,
    datasets: [
      {
        label: "頭のacc・gyroの平均値",
        data: MPU6886Average.head,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "左腕のacc・gyroの平均値",
        data: MPU6886Average.left,
        borderColor: "rgb(2, 99, 132)",
        backgroundColor: "rgba(2, 99, 132, 0.5)",
      },
      {
        label: "右腕のacc・gyroの平均値",
        data: MPU6886Average.right,
        borderColor: "rgb(2, 200, 132)",
        backgroundColor: "rgba(2, 200, 132, 0.5)",
      },
    ],
  };
};

const calculateHeavyLoadPerMinute = (
  indexData: ReadonlyArray<indexData>
): {
  readonly headHeavyLoad: ReadonlyArray<number>;
  readonly leftHeavyLoad: ReadonlyArray<number>;
  readonly rightHeavyLoad: ReadonlyArray<number>;
} => {
  const headArray: heavyLoad[] = [];
  const leftArray: heavyLoad[] = [];
  const rightArray: heavyLoad[] = [];
  indexData.forEach((data: indexData, index: number) => {
    if (data.diffHead > 100) {
      headArray.push({ index: index, value: data.diffHead });
    }
    if (data.diffLeft > 100) {
      leftArray.push({ index: index, value: data.diffLeft });
    }
    if (data.diffRight > 100) {
      rightArray.push({ index: index, value: data.diffRight });
    }
  });
  const head: ReadonlyArray<heavyLoad> = headArray;
  const left: ReadonlyArray<heavyLoad> = leftArray;
  const right: ReadonlyArray<heavyLoad> = rightArray;

  const headArr = [0, 0, 0, 0, 0];
  const leftArr = [0, 0, 0, 0, 0];
  const rightArr = [0, 0, 0, 0, 0];

  head.forEach((data) => {
    const i = Math.round(data.index / 10);
    headArr[i - 1]++;
  });
  left.forEach((data) => {
    const i = Math.round(data.index / 10);
    leftArr[i - 1]++;
  });
  right.forEach((data) => {
    const i = Math.round(data.index / 10);
    rightArr[i - 1]++;
  });
  console.log(headArr);
  console.log(leftArr);
  console.log(rightArr);
  return {
    headHeavyLoad: headArr,
    leftHeavyLoad: leftArr,
    rightHeavyLoad: rightArr,
  };
};

const calculateHeavyLoadPerMinuteChartData = (
  indexData: ReadonlyArray<indexData>
): ChartData<"line", ReadonlyArray<number>, number> => {
  const heavyLoadPerMinute = calculateHeavyLoadPerMinute(indexData);
  return {
    labels,
    datasets: [
      {
        label: "分あたりの頭の高負荷運動の回数",
        data: heavyLoadPerMinute.headHeavyLoad,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "分あたりの左腕の高負荷運動の回数",
        data: heavyLoadPerMinute.leftHeavyLoad,
        borderColor: "rgb(2, 99, 132)",
        backgroundColor: "rgba(2, 99, 132, 0.5)",
      },
      {
        label: "分あたりの右腕の高負荷運動の回数",
        data: heavyLoadPerMinute.rightHeavyLoad,
        borderColor: "rgb(2, 200, 132)",
        backgroundColor: "rgba(2, 200, 132, 0.5)",
      },
    ],
  };
};

export const App = (): JSX.Element => {
  const [MPU6886, setMPU6886] = useState<
    ReadonlyArray<ReadonlyArray<MPU6886Object>> | undefined
  >(undefined);
  const [env3, setEnv3] = useState<
    ReadonlyArray<ReadonlyArray<env3>> | undefined
  >(undefined);
  const [indexData, setIndexData] = useState<
    ReadonlyArray<indexData> | undefined
  >(undefined);

  const getDataFromDB = (): void => {
    axios
      .get<ReadonlyArray<MPU6886Object>>(
        "http://localhost:3030/api/edge_data/MPU6886"
      )
      .then((response) => {
        console.log(response.data);
        const splitedData = divideArrIntoPieces(response.data, 60);
        console.log(splitedData);
        setMPU6886(splitedData);
      });
    axios
      .get<ReadonlyArray<env3>>("http://localhost:3030/api/edge_data/ENV3")
      .then((response) => {
        console.log(response.data);
        const splitedData = divideArrIntoPieces(response.data, 60);
        console.log(splitedData);
        setEnv3(splitedData);
      });
    axios
      .get<ReadonlyArray<indexData>>(
        "http://localhost:3030/api/edge_data/indexData"
      )
      .then((response) => {
        console.log(response.data);
        setIndexData(response.data);
      });
  };

  useEffect((): void => {
    getDataFromDB();
  }, []);

  const armUpDown: number | undefined =
    indexData === undefined
      ? undefined
      : indexData[indexData.length - 1]?.armUpDown;
  console.log({ armUpDown });

  // データ可視化のデータオプション等

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

  const options: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Chart.js Line Chart",
      },
    },
  };

  return (
    <div>
      <h1>データを可視化プロジェクト</h1>
      {armUpDown && (
        <>
          <h2>腕の上げ下げ回数: {armUpDown}</h2>
        </>
      )}
      {MPU6886 && (
        <Line
          options={options}
          data={calculateMPU6886AverageChartData(MPU6886)}
        ></Line>
      )}
      {indexData && (
        <Line
          options={options}
          data={calculateHeavyLoadPerMinuteChartData(indexData)}
        />
      )}
    </div>
  );
};

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

export const App = (): JSX.Element => {
  /** 状態 */
  const [MPU6886, setMPU6886] = useState<
    ReadonlyArray<ReadonlyArray<MPU6886Object>> | undefined
  >(undefined);
  /** 状態 */
  const [env3, setEnv3] = useState<
    ReadonlyArray<ReadonlyArray<env3>> | undefined
  >(undefined); //平均値を出す
  /** 状態 */
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
    if (!MPU6886) {
      getDataFromDB();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const armUpDown: number | undefined =
    indexData === undefined
      ? undefined
      : indexData[indexData.length - 1]?.armUpDown;
  console.log({ armUpDown });

  let head: ReadonlyArray<heavyLoad> | undefined = undefined;
  let left: ReadonlyArray<heavyLoad> | undefined = undefined;
  let right: ReadonlyArray<heavyLoad> | undefined = undefined;

  if (indexData !== undefined) {
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
    head = headArray;
    left = leftArray;
    right = rightArray;
  }

  let avgHead: ReadonlyArray<number> | undefined = undefined;
  let avgLeft: ReadonlyArray<number> | undefined = undefined;
  let avgRight: ReadonlyArray<number> | undefined = undefined;

  if (MPU6886 !== undefined) {
    // diffの値を使うように変更する
    const tempAvgHead: number[] = [];
    const tempAvgRight: number[] = [];
    const tempAvgLeft: number[] = [];
    if (MPU6886) {
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
    }
    avgHead = tempAvgHead;
    avgLeft = tempAvgLeft;
    avgRight = tempAvgRight;
  }

  let headHeavyLoad: ReadonlyArray<number> | undefined = undefined;
  let leftHeavyLoad: ReadonlyArray<number> | undefined = undefined;
  let rightHeavyLoad: ReadonlyArray<number> | undefined = undefined;

  if (head !== undefined && headHeavyLoad === undefined) {
    const headArr = [0, 0, 0, 0, 0];
    const leftArr = [0, 0, 0, 0, 0];
    const rightArr = [0, 0, 0, 0, 0];
    if (head) {
      head.forEach((data) => {
        const i = Math.round(data.index / 10);
        headArr[i - 1]++;
      });
      left!.forEach((data) => {
        const i = Math.round(data.index / 10);
        leftArr[i - 1]++;
      });
      right!.forEach((data) => {
        const i = Math.round(data.index / 10);
        rightArr[i - 1]++;
      });
    }
    console.log(headArr);
    console.log(leftArr);
    console.log(rightArr);
    headHeavyLoad = headArr;
    leftHeavyLoad = leftArr;
    rightHeavyLoad = rightArr;
  }

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

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Chart.js Line Chart",
      },
    },
  };

  const labels = [1, 2, 3, 4, 5];

  const MPU6886Data = {
    labels,
    datasets: [
      {
        label: "頭のacc・gyroの平均値",
        data: avgHead,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "左腕のacc・gyroの平均値",
        data: avgLeft,
        borderColor: "rgb(2, 99, 132)",
        backgroundColor: "rgba(2, 99, 132, 0.5)",
      },
      {
        label: "右腕のacc・gyroの平均値",
        data: avgRight,
        borderColor: "rgb(2, 200, 132)",
        backgroundColor: "rgba(2, 200, 132, 0.5)",
      },
    ],
  };

  const heavyLoadData: ChartData<
    "line",
    readonly number[] | undefined,
    number
  > = {
    labels,
    datasets: [
      {
        label: "分あたりの頭の高負荷運動の回数",
        data: headHeavyLoad,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "分あたりの左腕の高負荷運動の回数",
        data: leftHeavyLoad,
        borderColor: "rgb(2, 99, 132)",
        backgroundColor: "rgba(2, 99, 132, 0.5)",
      },
      {
        label: "分あたりの右腕の高負荷運動の回数",
        data: rightHeavyLoad,
        borderColor: "rgb(2, 200, 132)",
        backgroundColor: "rgba(2, 200, 132, 0.5)",
      },
    ],
  };

  return (
    <div>
      <h1>データを可視化プロジェクト</h1>
      {armUpDown && (
        <>
          <h2>腕の上げ下げ回数: {armUpDown}</h2>
        </>
      )}
      {avgHead && <Line options={options} data={MPU6886Data}></Line>}
      {headHeavyLoad && <Line options={options} data={heavyLoadData} />}
    </div>
  );
};

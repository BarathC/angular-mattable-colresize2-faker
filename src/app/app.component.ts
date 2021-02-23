import { SelectionModel } from "@angular/cdk/collections";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  Renderer2,
  ViewChild
} from "@angular/core";
import { MatMenuTrigger } from "@angular/material/menu";
import { MatTable, MatTableDataSource } from "@angular/material/table";
import { BehaviorSubject, fromEvent, interval, Observable, of, Subscription } from "rxjs";
import { delayWhen, tap } from "rxjs/operators";
import { ColumnSorterComponent } from "./column-sorter/column-sorter.component";
import { FakeuserService, UserDetails } from "./fake-user.service";

export interface PeriodicElement {
  Name: string;
  Position: number;
  Weight: number;
  Symbol: string;
}

@Component({
  selector: "my-app",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit, AfterViewInit {
  title = "Material Table column Resize";
  @ViewChild(MatTable, { read: ElementRef }) private matTableRef: ElementRef;

  columns: any[] = [];
  @ViewChild(ColumnSorterComponent) child: ColumnSorterComponent;
  tableColumns: any[] = [
    { field: "Name", width: 270, pinned: false },
    { field: "Email", width: 370, pinned: false },
    { field: "Phone", width: 100, pinned: false },
    { field: "Website", width: 100, pinned: false }
  ];
  displayedColumns: string[] = [];
  displayedColumnsNames: string[] = ["Name", "Email", "Phone", "Website"];
  //dataSource = ELEMENT_DATA;

  pressed = false;
  currentResizeIndex: number;
  startX: number;
  startWidth: number;
  isResizingRight: boolean;
  resizableMousemove: () => void;
  resizableMouseup: () => void;
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;

  contextMenuPosition = { x: '0px', y: '0px' };

  private nScrollPosition = 0;
  // public dataSource: Observable<UserDetails[]>;
  private dataStream: BehaviorSubject<UserDetails[]> = null;
  private arrUserDetails: UserDetails[] = [];
  public dataSource: MatTableDataSource<UserDetails>;
  public selection: SelectionModel<UserDetails>;
    windowClickSubscription: Subscription;
menuSubscription: any;
  // constructor() {
  //     this.dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
  //     this.selection = new SelectionModel<PeriodicElement>(true);
  // }
  constructor(
    private renderer: Renderer2,
    private oFakeService: FakeuserService
  ) {}

  ngOnInit() {
    this.arrUserDetails = this.oFakeService.fnGetItems();
    this.fnFillRowData();
    this.columns = this.tableColumns;
    this.setDisplayedColumns();
     this.windowClickSubscription = fromEvent(window, 'click').subscribe(() => {
      if (this.contextMenu.menuOpen) {
        this.contextMenu.closeMenu();
      }
    });
  }

   ngOnDestroy(): void {
    this.windowClickSubscription && this.windowClickSubscription.unsubscribe();
    this.menuSubscription && this.menuSubscription.unsubscribe();
  }

  ngAfterViewInit() {
    this.setTableResize(this.matTableRef.nativeElement.clientWidth);
  }

  onContextMenu(event: MouseEvent, item: UserDetails) {
    event.preventDefault();
    this.menuSubscription && this.menuSubscription.unsubscribe();
    this.menuSubscription = of(1)
      .pipe(
        tap(() => {
          if (this.contextMenu.menuOpen) {
            this.contextMenu.closeMenu();
          }
          this.contextMenuPosition.x = event.clientX + 'px';
          this.contextMenuPosition.y = event.clientY + 'px';
        }),
        // delay(this.contextMenu.menuOpen ? 200 : 0),
        delayWhen((_) => (this.contextMenu.menuOpen ? interval(200) : of(undefined))),
        tap(async() => {
          this.contextMenu.menuData = { 'item': item };
          this.contextMenu.openMenu();
          let backdrop: HTMLElement = null;
          do {
            await this.delay(100);
            backdrop = document.querySelector(
              'div.cdk-overlay-backdrop.cdk-overlay-transparent-backdrop.cdk-overlay-backdrop-showing'
            ) as HTMLElement;
          } while (backdrop === null);
          backdrop.style.pointerEvents = 'none';
        })
      )
      .subscribe();
    // this.contextMenuPosition.x = event.clientX + 'px';
    // this.contextMenuPosition.y = event.clientY + 'px';
    // this.contextMenu.menuData = { 'item': item };
    // this.contextMenu.openMenu();
  }

  delay(delayInms: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(2);
      }, delayInms);
    });
  }

  onContextMenuAction1(item: UserDetails) {
    alert(`Click on Action 1 for ${item.name}`);
  }

  onContextMenuAction2(item: UserDetails) {
    alert(`Click on Action 2 for ${item.name}`);
  }

  public onTableScroll(oEvent: any): void {
    const nTableViewHeight: number = oEvent.target.offsetHeight;
    const nTableScrollHeight: number = oEvent.target.scrollHeight;
    this.nScrollPosition = oEvent.target.scrollTop;

    const limit = nTableScrollHeight - nTableViewHeight - 100;
    if (this.nScrollPosition > limit) {
      // const bBottomReached: boolean = false

      // if (bBottomReached === true)
      //   return;

      // Load the next page
      this.oFakeService.fnPaginateUserDetails();
      this.fnFillRowData();
      this.fnScrollTo(this.nScrollPosition - 2 * 100);

      setTimeout(() => {
        this.setTableResize(this.matTableRef.nativeElement.clientWidth);
      }, 0);
    }
  }

  private fnScrollTo(position: number): void {
    if (!!this.matTableRef)
      this.renderer.setProperty(
        this.matTableRef.nativeElement,
        "scrollTop",
        position
      );
  }

  private fnFillRowData(): void {
    if (null === this.dataStream || undefined === this.dataStream) {
      this.dataStream = new BehaviorSubject<UserDetails[]>(this.arrUserDetails);
      // this.dataSource = this.dataStream.asObservable();
      this.dataSource = new MatTableDataSource<UserDetails>(
        this.arrUserDetails
      );
      this.selection = new SelectionModel<UserDetails>(false);
      this.selection.changed.asObservable().subscribe(value => {
        console.log(value.added[0]);
      });
    } else {
      const data = this.arrUserDetails;
      this.dataSource.data = data;
      //this.dataStream.next(this.arrUserDetails);
    }
  }

  public fnPinColumn(colName: any): void {
    colName.pinned = !colName.pinned;
    this.child.fnPinColumn(colName.field, colName.pinned);
  }

  columnMenuDropped(event: CdkDragDrop<any>): void {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this.displayedColumns = this.columns.map(colInfo => colInfo.field);
    setTimeout(() => {
      this.setTableResize(this.matTableRef.nativeElement.clientWidth);
    }, 0);
  }

  setTableResize(tableWidth: number) {
    let totWidth = 0;
    this.columns.forEach(column => {
      totWidth += column.width;
    });
    let scale = (tableWidth - 5) / totWidth;
    this.columns.forEach(column => {
      column.width *= scale;
      if (column.width < 100) {
        column.width = 100;
        totWidth = totWidth - 100;
        tableWidth = tableWidth - 100;
        scale = (tableWidth - 5) / totWidth;
      } else {
        totWidth = totWidth - column.width;
        tableWidth = tableWidth - column.width / scale;
      }
      this.setColumnWidth(column);
    });
  }

  setDisplayedColumns() {
    this.columns.forEach((column, index) => {
      column.index = index;
      this.displayedColumns[index] = column.field;
    });
  }

  public columnsReordered(columns: string[]): void {
    this.displayedColumns = columns;
    const columnName: string[] = this.displayedColumns.filter(
      item => !this.columns.find(a => a.field === item)
    );
    if (!!columnName && columnName.length > 0) {
      const columnadded = this.tableColumns.find(
        item => item.field === columnName[0]
      );
      this.columns.push(columnadded);
    }
    this.columns = this.columns.filter(item =>
      this.displayedColumns.includes(item.field)
    );
    this.columns.sort((item1, item2) => {
      return (
        this.displayedColumns.indexOf(item1.field) -
        this.displayedColumns.indexOf(item2.field)
      );
    });
    setTimeout(() => {
      this.setTableResize(this.matTableRef.nativeElement.clientWidth);
    }, 0);
  }

  onResizeColumn(event: any, headercell: any, index: number) {
    this.checkResizing(event, index);
    this.currentResizeIndex = index;
    this.pressed = true;
    this.startX = event.pageX;
    this.startWidth = headercell.clientWidth;
    event.preventDefault();
    this.mouseMove(index);
  }

  private checkResizing(event, index) {
    const cellData = this.getCellData(index);
    if (
      index === 0 ||
      (Math.abs(event.pageX - cellData.right) < cellData.width / 2 &&
        index !== this.columns.length - 1)
    ) {
      this.isResizingRight = true;
    } else {
      this.isResizingRight = false;
    }
  }

  private getCellData(index: number) {
    const headerRow = this.matTableRef.nativeElement.children[0];
    const cell = headerRow.children[index];
    return cell.getBoundingClientRect();
  }

  mouseMove(index: number) {
    this.resizableMousemove = this.renderer.listen(
      "document",
      "mousemove",
      event => {
        if (this.pressed && event.buttons) {
          const dx = this.isResizingRight
            ? event.pageX - this.startX
            : -event.pageX + this.startX;
          const width = this.startWidth + dx;
          if (this.currentResizeIndex === index && width > 100) {
            this.setColumnWidthChanges(index, width);
          }
        }
      }
    );
    this.resizableMouseup = this.renderer.listen(
      "document",
      "mouseup",
      event => {
        if (this.pressed) {
          this.pressed = false;
          this.currentResizeIndex = -1;
          this.resizableMousemove();
          this.resizableMouseup();
        }
      }
    );
  }

  setColumnWidthChanges(index: number, width: number) {
    const orgWidth = this.columns[index].width;
    const dx = width - orgWidth;
    if (dx !== 0) {
      const j = this.isResizingRight ? index + 1 : index - 1;
      const newWidth = this.columns[j].width - dx;
      if (newWidth > 100) {
        this.columns[index].width = width;
        this.setColumnWidth(this.columns[index]);
        this.columns[j].width = newWidth;
        this.setColumnWidth(this.columns[j]);
      }
    }
  }

  setColumnWidth(column: any) {
    const columnEls = Array.from(
      document.getElementsByClassName("mat-column-" + column.field)
    );
    columnEls.forEach((el: HTMLDivElement) => {
      el.style.width = column.width + "px";
    });
  }

  @HostListener("window:resize", ["$event"])
  onResize(event) {
    this.setTableResize(this.matTableRef.nativeElement.clientWidth);
  }

  
    /**
     * Method check if the html element is within view port
     *
     * @static
     * @param {ElementRef} oElementRef
     * @returns
     * @memberof ImCtClScrolltoitemhelper
     */
    public static fnCheckIfElementIsWithinViewport(oElementRef: ElementRef) {
        if (!!oElementRef) {
            const oElement: HTMLElement = (oElementRef.nativeElement as HTMLElement);
            if ((oElement != undefined) && (oElement != null)) {
                var oElementOffsets = oElement.getBoundingClientRect();
                return (
                    (oElementOffsets.top >= 0) &&
                    (oElementOffsets.left >= 0) &&
                    (oElementOffsets.bottom <= window.innerHeight) &&
                    (oElementOffsets.right <= window.innerWidth)
                );
            } else {
                return false;
            }
        }
        else
            return false;
    }


    /**
     * Method to scroll item into view
     *
     * @static
     * @param {ElementRef} oElementRef
     * @memberof ImCtClScrolltoitemhelper
     */
    public static fnScrollIntoView(oElementRef: ElementRef): void {
        if (!!oElementRef) {
            const oElement = (oElementRef.nativeElement as HTMLElement);
            if (!!oElement)
                oElement.scrollIntoView(false);
        }
    }
}
